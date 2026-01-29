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
    // Smaller charts for PDF - 40% reduction
    this.chartJSNodeCanvas = new ChartJSNodeCanvas({
      width: 720, // Reduced from 1200
      height: 480, // Reduced from 800
      backgroundColour: "transparent",
    });
    logger.info("[PDFService] Initialized", { environment: "development" });
  }

  async generateActivityReportPDF(reportData, userSettings) {
    try {
      logger.info("[PDFService] Starting PDF generation", { environment: "development" });

      // Generate chart images
      logger.info("[PDFService] Generating chart images...", { environment: "development" });
      const chartImages = await this.generateChartImages(reportData);
      logger.info("[PDFService] Chart images generated", {
        environment: "development",
        chartCount: Object.keys(chartImages).length,
      });

      // Render HTML template
      logger.info("[PDFService] Rendering HTML template...", { environment: "development" });
      const html = await this.renderTemplate(reportData, chartImages, userSettings);
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
      // Generate Work Items pie chart
      if (reportData.workItems?.stateDistribution) {
        logger.info("[PDFService] Generating Work Items chart", { environment: "development" });
        images.workItems = await this.generatePieChart(reportData.workItems.stateDistribution, [
          "#3b82f6",
          "#a855f7",
          "#f97316",
          "#ec4899",
          "#06b6d4",
        ]);
      }

      // Generate Builds pie chart
      if (reportData.builds) {
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

      // Generate Releases bar chart
      if (reportData.releases) {
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

      // Generate PRs bar chart
      if (reportData.pullRequests) {
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

      // Generate PR Discussion pie chart
      if (reportData.prDiscussion) {
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

  async generatePieChart(data, colors) {
    const labels = Object.keys(data);
    const values = Object.values(data);

    const configuration = {
      type: "pie",
      data: {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: colors,
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              font: { size: 11 },
              padding: 10,
              boxWidth: 12,
            },
          },
        },
      },
    };

    const image = await this.chartJSNodeCanvas.renderToBuffer(configuration);
    return `data:image/png;base64,${image.toString("base64")}`;
  }

  async generateBarChart(data, colors) {
    const labels = Object.keys(data);
    const values = Object.values(data);

    const configuration = {
      type: "bar",
      data: {
        labels,
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
        plugins: {
          legend: { display: false },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { size: 10 } },
          },
          y: {
            grid: { display: false },
            ticks: { font: { size: 10 } },
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
      generatedAt: new Date().toLocaleString(),
      dateRange: this.formatDateRange(reportData.startDate, reportData.endDate),
    };

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
        margin: { top: "40px", right: "40px", bottom: "40px", left: "40px" },
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
