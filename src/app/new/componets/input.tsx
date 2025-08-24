"use client";
import { useState, useRef, type ChangeEvent, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch } from "@/lib/hooks";
import { useUploadFileMutation } from "@/lib/api/uploadApi";
import {
  addUploadRecord,
  setCurrentSession,
  addSessionData,
} from "@/lib/features/sessionSlice";

export default function HomeComponent() {
  const [message, setMessage] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>("Neural Network");
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);
  const [fileName, setFileName] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const router = useRouter();
  const dispatch = useAppDispatch();
  const [uploadFile, { isLoading, error }] = useUploadFileMutation();

  const models = [
    "Neural Network",
    "Naive Bayes",
    "Random Forest",
    "Decision Tree",
  ];

  const handleSend = async () => {
    if (!selectedFile) {
      alert("Please select a file to upload.");
      return;
    }

    try {
      const result = await uploadFile({
        file: selectedFile,
        description: message.trim() || undefined,
      }).unwrap();

      // Store session ID in Redux
      dispatch(setCurrentSession(result.session_id));

      // Store session data if available
      if (result.data_profile && result.recommendations && result.sample_data) {
        dispatch(
          addSessionData({
            sessionId: result.session_id,
            data_profile: result.data_profile,
            recommendations: result.recommendations,
            sample_data: result.sample_data,
          })
        );
      }

      dispatch(
        addUploadRecord({
          sessionId: result.session_id,
          fileName: selectedFile.name,
          description: message.trim() || "No description provided",
        })
      );

      // Navigate to the new page with session ID
      router.push(`/new/${result.session_id}`);

      // Reset form
      setMessage("");
      setFileName("");
      setSelectedFile(null);
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Upload failed. Please try again.");
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFileName(file.name);
      setSelectedFile(file);
    }
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const removeFile = () => {
    setFileName("");
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="min-h-screen bg-zinc-900 text-white flex flex-col items-center justify-center px-4">
      <div className="py-16">
        <p className="text-5xl">Good Morning</p>
      </div>
      <div className="w-full max-w-3xl">
        <div className="bg-zinc-800 rounded-lg border border-zinc-700 overflow-visible">
          <div className="min-h-[150px] px-4 py-3">
            <textarea
              className="w-full bg-transparent outline-none resize-none placeholder-zinc-500 text-lg"
              placeholder="Optional: Describe your data and analysis requirements..."
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
            />

            {fileName && (
              <div className="mt-2 flex items-center px-2 py-1 bg-zinc-700 rounded text-sm w-fit">
                <span className="truncate max-w-xs">{fileName}</span>
                <span className="ml-2 text-green-400 text-xs">
                  ({selectedFile ? Math.round(selectedFile.size / 1024) : 0}KB)
                </span>
                <button
                  className="ml-2 text-zinc-400 hover:text-zinc-200"
                  onClick={removeFile}
                  disabled={isLoading}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-4 h-4"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            )}

            {error && (
              <div className="mt-2 text-red-400 text-sm">
                Upload failed. Please try again.
              </div>
            )}
          </div>

          <div className="border-t border-zinc-700 p-2 flex items-center">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept=".csv,.json,.xlsx,.xls,.txt"
              disabled={isLoading}
            />
            <button
              className="px-3 py-1 text-sm flex items-center text-zinc-300 hover:bg-zinc-700 rounded-md mr-2 disabled:opacity-50"
              onClick={triggerFileInput}
              disabled={isLoading}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-4 h-4 mr-1"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13"
                />
              </svg>
              <span>Upload</span>
            </button>

            <div className="relative">
              <button
                className="px-3 py-1 text-sm flex items-center space-x-1 text-zinc-300 hover:bg-zinc-700 rounded-md disabled:opacity-50"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                disabled={isLoading}
              >
                <span>{selectedModel}</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className={`w-4 h-4 transition-transform ${
                    dropdownOpen ? "rotate-180" : ""
                  }`}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                  />
                </svg>
              </button>

              {dropdownOpen && (
                <div className="absolute left-0 top-8 mt-1 bg-zinc-800 border border-zinc-700 rounded-md shadow-lg w-48 z-50">
                  {models.map((model) => (
                    <button
                      key={model}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-zinc-700 ${
                        selectedModel === model ? "bg-zinc-700" : ""
                      }`}
                      onClick={() => {
                        setSelectedModel(model);
                        setDropdownOpen(false);
                      }}
                    >
                      {model}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="text-xs text-zinc-500 mx-2">
              Press Enter to send
            </div>
            <button
              className="ml-auto bg-violet-600 hover:bg-violet-500 text-white rounded-md px-4 py-1 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!selectedFile || isLoading}
              onClick={handleSend}
            >
              {isLoading ? "Uploading..." : "Send"}
            </button>
          </div>
        </div>
      </div>

      {dropdownOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setDropdownOpen(false)}
        />
      )}
    </div>
  );
}
