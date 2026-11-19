import { buildOwnerReport } from "../reports/owner-report.js";

function localClock(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", weekday: "short", hourCycle: "h23"
  }).formatToParts(date);
  return Object.fromEntries(parts.filter(part => part.type !== "literal").map(part => [part.type, part.value]));
}
function mondayKey(parts) {
  const key = parts.year + "-" + parts.month + "-" + parts.day;
  const date = new Date(key + "T12:00:00Z");
  const day = date.getUTCDay();
  date.setUTCDate(date.getUTCDate() - (day === 0 ? 6 : day - 1));
  return date.toISOString().slice(0, 10);
}
export function getDueOwnerReports(now, { timeZone = "America/Bogota", dailyTime = "08:00", weeklyTime = "08:15" } = {}) {
  const p = localClock(now, timeZone);
  const dateKey = p.year + "-" + p.month + "-" + p.day;
  const due = [];
  if (p.hour + ":" + p.minute >= dailyTime) due.push({ period: "daily", key: "daily:" + dateKey });
  if (p.weekday === "Mon" && p.hour + ":" + p.minute >= weeklyTime) due.push({ period: "weekly", key: "weekly:" + mondayKey(p) });
  return due;
}
export function startOwnerReportWorker({ store, whatsapp, config, nowProvider = () => new Date(), intervalMs = 30000, runOnStart = true }) {
  let running = false;
  let stopped = false;
  async function runOnce() {
    if (running || stopped || !config.ownerReportsEnabled || !config.ownerWhatsAppNumber) return;
    running = true;
    try {
      const now = nowProvider();
      const due = getDueOwnerReports(now, {
        timeZone: config.reportTimeZone,
        dailyTime: config.ownerDailyReportTime,
        weeklyTime: config.ownerWeeklyReportTime
      });
      if (!due.length) return;
      const audit = await store.listAudit(1000);
      for (const item of due) {
        if (audit.some(event => event.type === "scheduled_owner_report_sent" && event.key === item.key)) continue;
        const report = await buildOwnerReport(store, { period: item.period, now, timeZone: config.reportTimeZone });
        await whatsapp.sendText(config.ownerWhatsAppNumber, report.text);
        await store.audit({
          type: "scheduled_owner_report_sent",
          key: item.key,
          period: item.period,
          start: report.start.toISOString(),
          end: report.end.toISOString()
        });
      }
    } catch (error) {
      console.error("Error generando reporte programado:", error);
    } finally { running = false; }
  }
  const timer = setInterval(runOnce, intervalMs);
  timer.unref?.();
  if (runOnStart) void runOnce();
  return { stop() { stopped = true; clearInterval(timer); }, runOnce };
}
