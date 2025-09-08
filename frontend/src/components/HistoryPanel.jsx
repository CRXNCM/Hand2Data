import React from "react";

const HistoryPanel = () => {
  const mockHistory = [
    { id: 1, file: "invoice.pdf", date: "2025-09-01", status: "Completed" },
    { id: 2, file: "notes.jpg", date: "2025-09-05", status: "Completed" },
    { id: 3, file: "contract.png", date: "2025-09-07", status: "Failed" },
  ];

  return (
    <div className="p-6 text-gray-100 bg-gray-900 min-h-screen">
      <h1 className="text-2xl font-bold mb-6">History</h1>

      <div className="bg-gray-800 rounded-xl shadow-md p-6">
        <table className="w-full text-left text-gray-300">
          <thead className="border-b border-gray-700 text-gray-400">
            <tr>
              <th className="pb-3">File</th>
              <th className="pb-3">Date</th>
              <th className="pb-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {mockHistory.map((item) => (
              <tr
                key={item.id}
                className="border-b border-gray-700 last:border-none"
              >
                <td className="py-3">{item.file}</td>
                <td className="py-3">{item.date}</td>
                <td
                  className={`py-3 ${
                    item.status === "Completed"
                      ? "text-green-400"
                      : "text-red-400"
                  }`}
                >
                  {item.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default HistoryPanel;
