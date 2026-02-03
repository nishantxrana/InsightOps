import puppeteer from "puppeteer";
import ejs from "ejs";
import { ChartJSNodeCanvas } from "chartjs-node-canvas";
import path from "path";
import { fileURLToPath } from "url";
import { logger } from "../utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class PDFService {
  constructor() {
    // Square canvas for circular pie charts
    this.chartJSNodeCanvas = new ChartJSNodeCanvas({
      width: 600,
      height: 600,
      backgroundColour: "transparent",
    });
    logger.info("[PDFService] Initialized", { environment: "development" });
  }

  async generateActivityReportPDF(reportData, userSettings) {
    try {
      logger.info("[PDFService] Starting PDF generation", { environment: "development" });

      // Prepare safe metrics BEFORE chart generation
      const safeMetrics = this.prepareSafeMetrics(reportData);

      // Generate chart images
      logger.info("[PDFService] Generating chart images...", { environment: "development" });
      const chartImages = await this.generateChartImages(safeMetrics);
      logger.info("[PDFService] Chart images generated", {
        environment: "development",
        chartCount: Object.keys(chartImages).length,
      });

      // Render HTML template
      logger.info("[PDFService] Rendering HTML template...", { environment: "development" });
      const html = await this.renderTemplate(safeMetrics, chartImages, userSettings);
      logger.info("[PDFService] HTML template rendered", {
        environment: "development",
        htmlLength: html.length,
      });

      // Convert to PDF
      logger.info("[PDFService] Converting to PDF...", { environment: "development" });
      const pdf = await this.convertToPDF(html);
      logger.info("[PDFService] PDF generated successfully", {
        environment: "development",
        pdfSize: pdf.length,
      });

      return pdf;
    } catch (error) {
      logger.error("[PDFService] PDF generation failed", {
        environment: "development",
        error: error.message,
        stack: error.stack,
      });
      throw new Error("Failed to generate PDF: " + error.message);
    }
  }

  async generateChartImages(reportData) {
    const images = {};

    try {
      // Generate Work Items pie chart - only if sufficient data
      if (reportData.workItems?.stateDistribution && reportData.workItems?.hasSufficientData) {
        logger.info("[PDFService] Generating Work Items chart", { environment: "development" });

        // Get top 5 states by count
        const stateEntries = Object.entries(reportData.workItems.stateDistribution);
        const sortedStates = stateEntries.sort((a, b) => b[1] - a[1]).slice(0, 5);
        const top5States = Object.fromEntries(sortedStates);

        images.workItems = await this.generatePieChartWithHorizontalLegend(top5States, [
          "#3b82f6",
          "#a855f7",
          "#f97316",
          "#ec4899",
          "#06b6d4",
        ]);
      }

      // Generate Builds pie chart - only if sufficient data
      if (reportData.builds?.hasSufficientData) {
        logger.info("[PDFService] Generating Builds chart", { environment: "development" });
        images.builds = await this.generatePieChart(
          {
            Succeeded: reportData.builds.succeeded,
            Failed: reportData.builds.failed,
            Others: reportData.builds.others,
          },
          ["#16a34a", "#dc2626", "#f97316"]
        );
      }

      // Generate Releases bar chart - only if sufficient data
      if (reportData.releases?.hasSufficientData) {
        logger.info("[PDFService] Generating Releases chart", { environment: "development" });
        images.releases = await this.generateBarChart(
          {
            Succeeded: reportData.releases.succeeded,
            Failed: reportData.releases.failed,
            Others: reportData.releases.others,
          },
          ["#16a34a", "#dc2626", "#f97316"]
        );
      }

      // Generate PRs bar chart - only if sufficient data
      if (reportData.pullRequests?.hasSufficientData) {
        logger.info("[PDFService] Generating Pull Requests chart", { environment: "development" });
        images.pullRequests = await this.generateBarChart(
          {
            Completed: reportData.pullRequests.completed,
            Active: reportData.pullRequests.active,
            Abandoned: reportData.pullRequests.abandoned,
          },
          ["#16a34a", "#3b82f6", "#64748b"]
        );
      }

      // Generate PR Discussion pie chart - only if sufficient data
      if (reportData.prDiscussion?.hasSufficientData) {
        logger.info("[PDFService] Generating PR Discussion chart", { environment: "development" });
        images.prDiscussion = await this.generatePieChart(
          {
            Resolved: reportData.prDiscussion.resolved,
            Unresolved: reportData.prDiscussion.unresolved,
          },
          ["#16a34a", "#f97316"]
        );
      }

      return images;
    } catch (error) {
      logger.error("[PDFService] Chart generation failed", {
        environment: "development",
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  // Safe percentage calculation
  safePercentage(numerator, denominator) {
    if (!denominator || denominator === 0) return null;
    return Math.round((numerator / denominator) * 100);
  }

  // Check if section has sufficient data
  hasSufficientData(sectionData) {
    if (!sectionData) return false;

    // For PRs: check if we have actual status breakdown
    if (sectionData.totalPRs !== undefined) {
      const hasStatusData =
        (sectionData.active || 0) + (sectionData.completed || 0) + (sectionData.abandoned || 0) > 0;
      return sectionData.totalPRs >= 5 && hasStatusData;
    }

    // For PR Discussion: check if we have actual thread data
    if (sectionData.totalThreads !== undefined) {
      const hasThreadData = (sectionData.resolved || 0) + (sectionData.unresolved || 0) > 0;
      return sectionData.totalThreads >= 5 && hasThreadData;
    }

    // For other sections: check total count
    const total = sectionData.totalBuilds || sectionData.totalReleases || sectionData.created || 0;
    return total >= 5;
  }

  // Prepare safe metrics for template
  prepareSafeMetrics(reportData) {
    return {
      startDate: reportData.startDate,
      endDate: reportData.endDate,
      productionOnly: reportData.productionOnly,
      filters: reportData.filters,
      builds: {
        ...reportData.builds,
        successRate: this.safePercentage(
          reportData.builds?.succeeded,
          reportData.builds?.totalBuilds
        ),
        hasSufficientData: this.hasSufficientData(reportData.builds),
      },
      releases: {
        ...reportData.releases,
        successRate: this.safePercentage(
          reportData.releases?.succeeded,
          reportData.releases?.totalReleases
        ),
        hasSufficientData: this.hasSufficientData(reportData.releases),
      },
      pullRequests: {
        totalPRs: reportData.pullRequests?.totalPRs || 0,
        // Handle both flat and nested byStatus structure
        active: reportData.pullRequests?.active || reportData.pullRequests?.byStatus?.active || 0,
        completed:
          reportData.pullRequests?.completed || reportData.pullRequests?.byStatus?.completed || 0,
        abandoned:
          reportData.pullRequests?.abandoned || reportData.pullRequests?.byStatus?.abandoned || 0,
        avgTimeToComplete: reportData.pullRequests?.avgTimeToComplete,
        completionRate: this.safePercentage(
          reportData.pullRequests?.completed || reportData.pullRequests?.byStatus?.completed,
          reportData.pullRequests?.totalPRs
        ),
        idleCount: reportData.pullRequests?.idle || 0,
        hasSufficientData: this.hasSufficientData({
          totalPRs: reportData.pullRequests?.totalPRs,
          active: reportData.pullRequests?.active || reportData.pullRequests?.byStatus?.active,
          completed:
            reportData.pullRequests?.completed || reportData.pullRequests?.byStatus?.completed,
          abandoned:
            reportData.pullRequests?.abandoned || reportData.pullRequests?.byStatus?.abandoned,
        }),
      },
      prDiscussion: {
        totalThreads: reportData.prDiscussion?.totalThreads || 0,
        // Handle different field name variations
        resolved:
          reportData.prDiscussion?.resolved ||
          reportData.prDiscussion?.resolvedThreads ||
          reportData.prDiscussion?.byStatus?.resolved ||
          0,
        unresolved:
          reportData.prDiscussion?.unresolved ||
          reportData.prDiscussion?.unresolvedThreads ||
          reportData.prDiscussion?.byStatus?.unresolved ||
          0,
        prsNeedReview:
          reportData.prDiscussion?.prsNeedReview ||
          reportData.prDiscussion?.prsWithUnresolvedThreads ||
          0,
        totalComments: reportData.prDiscussion?.totalComments || 0,
        resolutionRate: this.safePercentage(
          reportData.prDiscussion?.resolved || reportData.prDiscussion?.resolvedThreads,
          reportData.prDiscussion?.totalThreads
        ),
        hasSufficientData: this.hasSufficientData({
          totalThreads: reportData.prDiscussion?.totalThreads,
          resolved: reportData.prDiscussion?.resolved || reportData.prDiscussion?.resolvedThreads,
          unresolved:
            reportData.prDiscussion?.unresolved || reportData.prDiscussion?.unresolvedThreads,
        }),
      },
      workItems: {
        ...reportData.workItems,
        overdueRate: this.safePercentage(
          reportData.workItems?.overdue,
          reportData.workItems?.created
        ),
        hasSufficientData: this.hasSufficientData(reportData.workItems),
      },
    };
  }

  async generatePieChart(data, colors) {
    const labels = Object.keys(data);
    const values = Object.values(data);

    // Create labels with counts: "Label (count)"
    const labelsWithCounts = labels.map((label, index) => `${label} (${values[index]})`);

    const configuration = {
      type: "pie",
      data: {
        labels: labelsWithCounts,
        datasets: [
          {
            data: values,
            backgroundColor: colors,
            borderWidth: 3,
            borderColor: "#ffffff",
          },
        ],
      },
      options: {
        responsive: false,
        maintainAspectRatio: true,
        aspectRatio: 1, // Force square/circular shape
        layout: {
          padding: {
            top: 20,
            bottom: 60,
            left: 20,
            right: 20,
          },
        },
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              font: {
                size: 18,
                weight: "bold",
              },
              padding: 15,
              boxWidth: 30,
              boxHeight: 30,
              usePointStyle: false,
              color: "#0f172a",
            },
          },
        },
      },
    };

    const image = await this.chartJSNodeCanvas.renderToBuffer(configuration);
    return `data:image/png;base64,${image.toString("base64")}`;
  }

  async generatePieChartWithHorizontalLegend(data, colors) {
    const labels = Object.keys(data);
    const values = Object.values(data);

    // Create labels with counts: "Label (count)"
    const labelsWithCounts = labels.map((label, index) => `${label} (${values[index]})`);

    // Create wider canvas for horizontal legend layout
    const wideCanvas = new ChartJSNodeCanvas({
      width: 900,
      height: 700,
      backgroundColour: "transparent",
    });

    const configuration = {
      type: "pie",
      data: {
        labels: labelsWithCounts,
        datasets: [
          {
            data: values,
            backgroundColor: colors,
            borderWidth: 3,
            borderColor: "#ffffff",
          },
        ],
      },
      options: {
        responsive: false,
        maintainAspectRatio: false,
        layout: {
          padding: {
            top: 30,
            bottom: 100,
            left: 150,
            right: 150,
          },
        },
        plugins: {
          legend: {
            position: "bottom",
            align: "center",
            labels: {
              font: {
                size: 15,
                weight: "bold",
              },
              padding: 10,
              boxWidth: 25,
              boxHeight: 25,
              usePointStyle: false,
              color: "#0f172a",
            },
          },
        },
      },
    };

    const image = await wideCanvas.renderToBuffer(configuration);
    return `data:image/png;base64,${image.toString("base64")}`;
  }

  async generateBarChart(data, colors) {
    const labels = Object.keys(data);
    const values = Object.values(data);

    // Create labels with counts: "Label (count)"
    const labelsWithCounts = labels.map((label, index) => `${label} (${values[index]})`);

    const configuration = {
      type: "bar",
      data: {
        labels: labelsWithCounts,
        datasets: [
          {
            data: values,
            backgroundColor: colors,
            borderWidth: 0,
          },
        ],
      },
      options: {
        indexAxis: "y",
        responsive: false,
        layout: {
          padding: {
            left: 30,
            right: 40,
            top: 30,
            bottom: 30,
          },
        },
        plugins: {
          legend: { display: false },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              font: { size: 18, weight: "bold" },
              color: "#0f172a",
            },
          },
          y: {
            grid: { display: false },
            ticks: {
              font: { size: 18, weight: "bold" },
              color: "#0f172a",
            },
          },
        },
      },
    };

    const image = await this.chartJSNodeCanvas.renderToBuffer(configuration);
    return `data:image/png;base64,${image.toString("base64")}`;
  }

  async renderTemplate(reportData, chartImages, userSettings) {
    const templatePath = path.join(__dirname, "../templates/activityReport.ejs");

    const templateData = {
      reportData,
      chartImages,
      userSettings,
      generatedAt: new Date().toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }),
      dateRange: this.formatDateRange(reportData.startDate, reportData.endDate),
    };

    logger.debug(
      `[PDFService] Template data: productionOnly=${reportData.productionOnly}, filters=${JSON.stringify(reportData.filters)}`,
      {
        environment: "development",
      }
    );

    return await ejs.renderFile(templatePath, templateData);
  }

  async convertToPDF(html) {
    let browser;
    try {
      logger.info("[PDFService] Launching Puppeteer browser...", { environment: "development" });
      browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
      logger.info("[PDFService] Browser launched", { environment: "development" });

      const page = await browser.newPage();
      logger.info("[PDFService] Setting page content...", { environment: "development" });
      await page.setContent(html, { waitUntil: "networkidle0" });
      logger.info("[PDFService] Page content set", { environment: "development" });

      logger.info("[PDFService] Generating PDF...", { environment: "development" });
      const pdf = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "0", right: "0", bottom: "15mm", left: "0" },
        displayHeaderFooter: true,
        headerTemplate: "<div></div>",
        footerTemplate: `
          <div style="font-size: 9pt; color: #666; text-align: center; width: 100%; margin-top: 5mm;">
            <span class="pageNumber"></span>
          </div>
        `,
        preferCSSPageSize: true,
        scale: 1.0,
      });
      logger.info("[PDFService] PDF generated", { environment: "development" });

      return pdf;
    } catch (error) {
      logger.error("[PDFService] Puppeteer conversion failed", {
        environment: "development",
        error: error.message,
        stack: error.stack,
      });
      throw error;
    } finally {
      if (browser) {
        await browser.close();
        logger.info("[PDFService] Browser closed", { environment: "development" });
      }
    }
  }

  formatDateRange(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    return `${start.toLocaleDateString()} - ${end.toLocaleDateString()} (${days} days)`;
  }
}

export default new PDFService();
