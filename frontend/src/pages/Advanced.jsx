import React from "react";

const Advanced = () => {
  return (
    <div className="p-6 text-gray-100 bg-gray-900 min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Advanced</h1>

      <div className="bg-gray-800 p-6 rounded-xl shadow-md">
        <p className="text-gray-400 mb-4">
          Here you can configure advanced OCR options.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-gray-300 mb-1">
              OCR Language
            </label>
            <select className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option>English</option>
              <option>French</option>
              <option>Spanish</option>
              <option>Amharic</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-300 mb-1">
              Output Format
            </label>
            <select className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option>Plain Text</option>
              <option>PDF</option>
              <option>Word Document</option>
              <option>JSON</option>
            </select>
          </div>

          <button className="mt-4 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-md transition">
            Save Advanced Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default Advanced;
