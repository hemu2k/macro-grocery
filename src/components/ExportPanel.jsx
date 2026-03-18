import { useState } from "react";
import {
  formatPlainText,
  formatWhatsApp,
  formatCSV,
  formatJSON,
  formatShoppingChecklist,
  getPrintHTML,
} from "../utils/exportFormatters";

function Toast({ message }) {
  if (!message) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-full shadow-lg animate-in">
      <span className="text-green-400">✓</span>
      {message}
    </div>
  );
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function filenameSuffix(weekOf) {
  return new Date(weekOf)
    .toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    .replace(/,\s*/g, "-")
    .replace(/\s/g, "")
    .toLowerCase();
}

export default function ExportPanel({ items, weekOf, macroTotals, onClose }) {
  const [toast, setToast] = useState("");

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  }

  async function copyToClipboard(text, msg) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    showToast(msg);
  }

  const options = [
    {
      icon: "📱",
      label: "WhatsApp",
      desc: "Formatted list with emoji, ready to paste",
      action: () =>
        copyToClipboard(
          formatWhatsApp(items, weekOf, macroTotals),
          "Copied! Paste into WhatsApp"
        ),
      btnLabel: "Copy for WhatsApp",
      btnClass: "bg-green-600 hover:bg-green-700 text-white",
    },
    {
      icon: "📋",
      label: "Plain Text",
      desc: "Clean text list grouped by category",
      action: () =>
        copyToClipboard(
          formatPlainText(items, weekOf, macroTotals),
          "Copied to clipboard"
        ),
      btnLabel: "Copy Plain Text",
      btnClass: "bg-gray-800 hover:bg-gray-900 text-white",
    },
    {
      icon: "🖨️",
      label: "Print / Save as PDF",
      desc: "Opens a print-optimised view",
      action: () => {
        const win = window.open("", "_blank");
        win.document.write(getPrintHTML(items, weekOf, macroTotals));
        win.document.close();
      },
      btnLabel: "Open Print View",
      btnClass: "bg-indigo-600 hover:bg-indigo-700 text-white",
    },
    {
      icon: "📊",
      label: "CSV / Spreadsheet",
      desc: "Import into Excel or Google Sheets",
      action: () => {
        downloadFile(
          formatCSV(items, weekOf),
          `grocery-${filenameSuffix(weekOf)}.csv`,
          "text/csv"
        );
        showToast("CSV downloaded");
      },
      btnLabel: "Download CSV",
      btnClass: "bg-blue-600 hover:bg-blue-700 text-white",
    },
    {
      icon: "💾",
      label: "JSON Backup",
      desc: "Full data export with all macros",
      action: () => {
        downloadFile(
          formatJSON(items, weekOf, macroTotals),
          `grocery-backup-${filenameSuffix(weekOf)}.json`,
          "application/json"
        );
        showToast("JSON downloaded");
      },
      btnLabel: "Download JSON",
      btnClass: "bg-purple-600 hover:bg-purple-700 text-white",
    },
    {
      icon: "✅",
      label: "Quick Checklist",
      desc: "Just items and quantities, alphabetically sorted",
      action: () =>
        copyToClipboard(formatShoppingChecklist(items), "Checklist copied"),
      btnLabel: "Copy Checklist",
      btnClass: "bg-teal-600 hover:bg-teal-700 text-white",
    },
  ];

  return (
    <>
      <div className="fixed inset-0 z-40 flex justify-end">
        <div className="flex-1 bg-black/20" onClick={onClose} />
        <div className="w-80 bg-white shadow-2xl h-full overflow-y-auto flex flex-col">
          <div className="flex items-center justify-between p-5 border-b border-gray-100 flex-shrink-0">
            <h3 className="text-base font-semibold text-gray-800">Export your grocery list</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-4 space-y-3 flex-1">
            {options.map((opt) => (
              <div key={opt.label} className="border border-gray-100 rounded-xl p-4">
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-xl leading-none mt-0.5">{opt.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{opt.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{opt.desc}</p>
                  </div>
                </div>
                <button
                  onClick={opt.action}
                  className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${opt.btnClass}`}
                >
                  {opt.btnLabel}
                </button>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-gray-100 flex-shrink-0">
            <p className="text-xs text-gray-400 text-center">
              {items.filter((i) => i.included).length} items included
            </p>
          </div>
        </div>
      </div>

      <Toast message={toast} />
    </>
  );
}
