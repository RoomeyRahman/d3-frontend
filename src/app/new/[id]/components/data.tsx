"use client";
import { useAppSelector } from "@/lib/hooks";

interface DataComponentProps {
  sessionId: string;
}

const DataComponent = ({ sessionId }: DataComponentProps) => {
  const sessionData = useAppSelector(
    (state) => state.session.sessions[sessionId]
  );

  if (!sessionData?.sample_data || sessionData.sample_data.length === 0) {
    return (
      <div className="p-5 max-w-2xl mx-auto">
        <h2 className="text-lg font-semibold mb-3 text-gray-900">Data Table</h2>
        <p className="text-gray-600">No data available for this session.</p>
      </div>
    );
  }

  const headers = Object.keys(sessionData.sample_data[0]);

  return (
    <div className="p-5 max-w-2xl mx-auto">
      <h2 className="text-lg font-semibold mb-3 text-gray-900">Data Table</h2>
      <div className="text-sm text-gray-600 mb-3">
        Showing {sessionData.sample_data.length} of{" "}
        {sessionData.data_profile.num_rows} rows
      </div>
      <div className="overflow-x-auto border rounded-lg shadow-md">
        <table className="min-w-full">
          <thead className="bg-gray-300 text-gray-900">
            <tr>
              {headers.map((header) => (
                <th key={header} className="py-2 px-4 border capitalize">
                  {header.replace(/_/g, " ")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sessionData.sample_data.map((item, index) => (
              <tr key={index} className="text-center bg-gray-200 text-gray-900">
                {headers.map((header) => (
                  <td key={header} className="py-2 px-4 border">
                    {item[header]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataComponent;
