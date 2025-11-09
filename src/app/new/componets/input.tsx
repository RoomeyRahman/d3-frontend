"use client";
import { useState, useRef, type ChangeEvent, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch } from "@/lib/hooks";
import { useGetChartRecommendationsMutation } from "@/lib/api/uploadApi";
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
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [currentStep, setCurrentStep] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const router = useRouter();
  const dispatch = useAppDispatch();
  const [getChartRecommendations, { isLoading, error }] =
    useGetChartRecommendationsMutation();

  const models = [
    "Neural Network",
    "Naive Bayes",
    "Random Forest",
    "Decision Tree",
  ];

  const processingSteps = [
    "Uploading file...",
    "Analyzing data structure...",
    "Generating insights...",
    "Preparing recommendations...",
    "Finalizing session...",
  ];

  const simulateProgress = async () => {
    setIsProcessing(true);
    setUploadProgress(0);

    for (let i = 0; i < processingSteps.length; i++) {
      setCurrentStep(processingSteps[i]);

      // Simulate different processing times for each step
      const stepDuration = i === 0 ? 800 : i === 1 ? 1200 : 600;
      const stepProgress = ((i + 1) / processingSteps.length) * 100;

      // Animate progress for this step
      const startProgress = (i / processingSteps.length) * 100;
      const progressIncrement = (stepProgress - startProgress) / 20;

      for (let j = 0; j < 20; j++) {
        await new Promise((resolve) => setTimeout(resolve, stepDuration / 20));
        setUploadProgress(startProgress + progressIncrement * (j + 1));
      }
    }
  };

  const handleSend = async () => {
    if (!selectedFile) {
      // Enhanced error animation
      const errorElement = document.querySelector(".upload-error");
      if (errorElement) {
        errorElement.classList.add("animate-shake");
        setTimeout(() => errorElement.classList.remove("animate-shake"), 500);
      }
      alert("Please select a file to upload.");
      return;
    }

    try {
      // Start the progress simulation
      await simulateProgress();

      // Get chart recommendations from the external API
      const chartResult = await getChartRecommendations({
        file: selectedFile,
        description: message.trim() || undefined,
      }).unwrap();

      // Complete the progress
      setUploadProgress(100);
      setCurrentStep("Analysis complete!");

      // Generate a session ID
      const sessionId = `session_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      // Store session ID in Redux
      dispatch(setCurrentSession(sessionId));

      // Store session data with chart recommendations
      const edgesData =
        chartResult.data?.find((item) => item.name === "links")?.df || [];

      // Create sample data for display - ensure all values are primitives
      const sampleData = edgesData
        .slice(0, 10)
        .map((edge, index) => {
          // Ensure all values are primitive types that can be safely rendered
          const source =
            typeof edge.source === "object"
              ? JSON.stringify(edge.source)
              : String(edge.source || "");
          const target =
            typeof edge.target === "object"
              ? JSON.stringify(edge.target)
              : String(edge.target || "");
          const value =
            typeof edge.value === "object" ? 0 : Number(edge.value || 0);

          return {
            id: index + 1, // Add an ID for table key
            source,
            target,
            value,
          };
        })
        .filter((item) => item.source && item.target); // Filter out invalid entries

      const chartDataForComponent = chartResult.chart_configurations;

      dispatch(
        addSessionData({
          sessionId: sessionId,
          dataset_id:
            "2a1cfce4f1d0de2a393b59fa893687c82d01b2de85f720b0becdb6a7cb9b02ab",
          data_profile: {
            num_rows: edgesData.length,
            num_columns: 3, // source, target, value
            column_types: {
              source: "string",
              target: "string",
              value: "number",
            },
            numerical_columns: ["value"],
            categorical_columns: ["source", "target"],
            temporal_columns: [],
            geographic_columns: [],
            statistical_summary: {},
            correlation_matrix: {},
            has_time_series: false,
            has_hierarchical: true,
            has_network_structure: true,
            has_geographic_data: false,
            null_percentages: {},
            unique_ratios: {},
            suggested_patterns:
              chartResult.patterns_detected?.map((p) => p.pattern) || [],
          },
          recommendations: chartResult.recommendations,
          sample_data: sampleData, // Properly formatted sample data
          chartData: chartDataForComponent,
          chartConfig: chartResult.chart_configurations,
          patternsDetected: chartResult.patterns_detected,
          original_payload: chartResult.original_payload || {
            links: [],
            nodes: [],
          },
        })
      );

      dispatch(
        addUploadRecord({
          sessionId: sessionId,
          fileName: selectedFile.name,
          description: message.trim() || "No description provided",
        })
      );

      // Success animation delay before navigation
      setTimeout(() => {
        router.push(`/new/${sessionId}`);
      }, 1000);

      // Reset form after a delay
      setTimeout(() => {
        setMessage("");
        setFileName("");
        setSelectedFile(null);
        setUploadProgress(0);
        setCurrentStep("");
        setIsProcessing(false);
      }, 1500);
    } catch (err) {
      console.error("Analysis failed:", err);
      setCurrentStep("Analysis failed");
      setIsProcessing(false);

      // Error shake animation
      const container = document.querySelector(".upload-container");
      if (container) {
        container.classList.add("animate-shake");
        setTimeout(() => container.classList.remove("animate-shake"), 500);
      }

      alert("Analysis failed. Please try again.");
      setUploadProgress(0);
      setCurrentStep("");
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

      // File selection animation
      const fileDisplay = document.querySelector(".file-display");
      if (fileDisplay) {
        fileDisplay.classList.add("animate-slideInUp");
        setTimeout(
          () => fileDisplay.classList.remove("animate-slideInUp"),
          300
        );
      }
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
      <style jsx>{`
        @keyframes shake {
          0%,
          100% {
            transform: translateX(0);
          }
          25% {
            transform: translateX(-5px);
          }
          75% {
            transform: translateX(5px);
          }
        }

        @keyframes slideInUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        @keyframes progressGlow {
          0%,
          100% {
            box-shadow: 0 0 5px rgba(139, 92, 246, 0.3);
          }
          50% {
            box-shadow: 0 0 20px rgba(139, 92, 246, 0.6);
          }
        }

        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }

        .animate-slideInUp {
          animation: slideInUp 0.3s ease-out;
        }

        .animate-pulse {
          animation: pulse 2s infinite;
        }

        .progress-glow {
          animation: progressGlow 2s infinite;
        }
      `}</style>

      <div className="py-16">
        <p className="text-5xl animate-pulse">Good Morning</p>
      </div>

      <div className="w-full max-w-3xl">
        <div className="upload-container bg-zinc-800 rounded-lg border border-zinc-700 overflow-visible transition-all duration-300 hover:border-zinc-600 hover:shadow-lg hover:shadow-violet-500/10">
          {/* Progress Overlay */}
          {isProcessing && (
            <div className="absolute inset-0 bg-zinc-900/90 backdrop-blur-sm rounded-lg z-50 flex flex-col items-center justify-center">
              <div className="text-center">
                <div className="mb-4">
                  <div className="w-16 h-16 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin mx-auto"></div>
                </div>

                <div className="mb-6">
                  <div className="text-lg font-medium text-white mb-2">
                    {currentStep}
                  </div>
                  <div className="w-64 h-2 bg-zinc-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-500 progress-glow"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                  <div className="text-sm text-zinc-400 mt-2">
                    {Math.round(uploadProgress)}% complete
                  </div>
                </div>

                <div className="flex items-center space-x-2 text-sm text-zinc-400">
                  <div className="w-2 h-2 bg-violet-500 rounded-full animate-pulse"></div>
                  <span>AI is analyzing your data...</span>
                </div>
              </div>
            </div>
          )}

          <div className="min-h-[150px] px-4 py-3">
            <textarea
              className="w-full bg-transparent outline-none resize-none placeholder-zinc-500 text-lg transition-all duration-200 focus:placeholder-zinc-400"
              placeholder="Optional: Describe your data and analysis requirements..."
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading || isProcessing}
            />

            {fileName && (
              <div className="file-display mt-2 flex items-center px-3 py-2 bg-gradient-to-r from-zinc-700 to-zinc-600 rounded-lg text-sm w-fit border border-zinc-600 shadow-lg">
                <div className="w-8 h-8 bg-violet-500/20 rounded-lg flex items-center justify-center mr-3">
                  <svg
                    className="w-4 h-4 text-violet-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <span className="text-white font-medium truncate max-w-xs block">
                    {fileName}
                  </span>
                  <span className="text-green-400 text-xs">
                    {selectedFile ? Math.round(selectedFile.size / 1024) : 0}KB
                  </span>
                </div>
                <button
                  className="ml-3 text-zinc-400 hover:text-red-400 transition-colors duration-200 hover:bg-red-500/10 rounded p-1"
                  onClick={removeFile}
                  disabled={isLoading || isProcessing}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
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
              <div className="upload-error mt-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded px-3 py-2">
                <div className="flex items-center">
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {error &&
                  "data" in error &&
                  error.data &&
                  typeof error.data === "object" &&
                  "detail" in error.data
                    ? String((error.data as { detail?: string }).detail)
                    : "An error occurred"}
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-zinc-700 p-3 flex items-center bg-zinc-800/50">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept=".csv,.json,.xlsx,.xls,.txt"
              disabled={isLoading || isProcessing}
            />

            <button
              className="px-4 py-2 text-sm flex items-center text-zinc-300 hover:bg-zinc-700 rounded-lg mr-3 disabled:opacity-50 transition-all duration-200 hover:text-white border border-transparent hover:border-zinc-600"
              onClick={triggerFileInput}
              disabled={isLoading || isProcessing}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-4 h-4 mr-2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13"
                />
              </svg>
              <span>Upload File</span>
            </button>

            <div className="relative">
              <button
                className="px-4 py-2 text-sm flex items-center space-x-2 text-zinc-300 hover:bg-zinc-700 rounded-lg disabled:opacity-50 transition-all duration-200 hover:text-white border border-transparent hover:border-zinc-600"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                disabled={isLoading || isProcessing}
              >
                <span className="font-medium">{selectedModel}</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className={`w-4 h-4 transition-transform duration-200 ${
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
                <div className="absolute left-0 top-12 mt-1 bg-zinc-800 border border-zinc-600 rounded-lg shadow-2xl w-48 z-50 overflow-hidden animate-slideInUp">
                  {models.map((model, index) => (
                    <button
                      key={model}
                      className={`w-full text-left px-4 py-3 text-sm hover:bg-zinc-700 transition-all duration-150 ${
                        selectedModel === model
                          ? "bg-violet-500/20 text-violet-300 border-r-2 border-violet-500"
                          : "text-zinc-300"
                      }`}
                      onClick={() => {
                        setSelectedModel(model);
                        setDropdownOpen(false);
                      }}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="flex items-center">
                        <div
                          className={`w-2 h-2 rounded-full mr-3 ${
                            selectedModel === model
                              ? "bg-violet-400"
                              : "bg-zinc-500"
                          }`}
                        ></div>
                        {model}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="text-xs text-zinc-500 mx-4 flex items-center">
              <kbd className="px-2 py-1 bg-zinc-700 rounded text-xs mr-2">
                Enter
              </kbd>
              <span>to send</span>
            </div>

            <button
              className={`ml-auto bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white rounded-lg px-6 py-2 text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center shadow-lg hover:shadow-violet-500/25 transform hover:scale-105 active:scale-95 ${
                selectedFile && !isLoading && !isProcessing
                  ? "animate-pulse"
                  : ""
              }`}
              disabled={!selectedFile || isLoading || isProcessing}
              onClick={handleSend}
            >
              {(isLoading || isProcessing) && (
                <svg
                  className="animate-spin -ml-1 mr-3 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              )}
              <span className="flex items-center">
                {isProcessing
                  ? "Processing..."
                  : isLoading
                  ? "Uploading..."
                  : "Analyze Data"}
                {!isLoading && !isProcessing && (
                  <svg
                    className="w-4 h-4 ml-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                )}
              </span>
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
