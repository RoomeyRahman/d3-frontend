"use client";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAppSelector } from "@/lib/hooks";
import { Database, FileText, BarChart3 } from "lucide-react";

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

  if (!sessionData?.sample_data || sessionData.sample_data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="p-4 bg-slate-100 rounded-full">
          <Database className="h-8 w-8 text-slate-400" />
        </div>
        <div className="text-center">
          <h3 className="font-medium text-slate-900 mb-1">No Data Available</h3>
          <p className="text-sm text-slate-600">
            Upload a dataset to get started with analysis
          </p>
        </div>
      </div>
    );
  }

  const headers = Object.keys(sessionData.sample_data[0]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
          <div className="flex items-center space-x-2">
            <FileText className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">
              Total Rows
            </span>
          </div>
          <p className="text-xl font-bold text-blue-700 mt-1">
            {sessionData.data_profile.num_rows.toLocaleString()}
          </p>
        </div>
        <div className="p-3 bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg border border-emerald-100">
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-900">
              Columns
            </span>
          </div>
          <p className="text-xl font-bold text-emerald-700 mt-1">
            {sessionData.data_profile.num_columns}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-xs">
            Showing {sessionData.sample_data.length} of{" "}
            {sessionData.data_profile.num_rows} rows
          </Badge>
        </div>

        <div className="border rounded-lg overflow-hidden bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
                {headers.map((header) => (
                  <TableHead
                    key={header}
                    className="font-semibold text-slate-700 text-xs uppercase tracking-wide"
                  >
                    {header.replace(/_/g, " ")}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessionData.sample_data.map((item, index) => (
                <TableRow
                  key={index}
                  className="hover:bg-slate-50/50 transition-colors"
                >
                  {headers.map((header) => (
                    <TableCell
                      key={header}
                      className="text-sm text-slate-700 font-medium"
                    >
                      {typeof item[header] === "number"
                        ? item[header].toLocaleString()
                        : item[header]}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default DataComponent;
