import * as d3 from "d3";

export interface ChartDimensions {
  width: number;
  height: number;
  margin: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

export interface ChartData {
  processed_data: any[];
  field_mappings: Record<string, string>;
  chart_config: {
    dimensions: ChartDimensions;
    scales?: any;
    color_scheme?: any;
  };
}

export const createTooltip = () => {
  return d3
    .select("body")
    .append("div")
    .attr("class", "d3-tooltip")
    .style("position", "absolute")
    .style("visibility", "hidden")
    .style("background", "rgba(0, 0, 0, 0.8)")
    .style("color", "white")
    .style("padding", "8px")
    .style("border-radius", "4px")
    .style("font-size", "12px")
    .style("pointer-events", "none")
    .style("z-index", "1000");
};

export const addTooltips = (
  selection: d3.Selection<any, any, any, any>,
  chartData: ChartData
) => {
  const tooltip = createTooltip();
  const { field_mappings } = chartData;

  selection
    .on("mouseover", (event: any, d: any) => {
      const content = Object.keys(field_mappings)
        .map((key) => `${key}: ${d[field_mappings[key]]}`)
        .join("<br/>");

      tooltip.style("visibility", "visible").html(content);
    })
    .on("mousemove", (event: any) => {
      tooltip
        .style("top", event.pageY - 10 + "px")
        .style("left", event.pageX + 10 + "px");
    })
    .on("mouseout", () => {
      tooltip.style("visibility", "hidden");
    });
};

export const getColorScale = (colorScheme?: any) => {
  if (colorScheme?.type === "single") {
    return () => colorScheme.color;
  }
  return d3.scaleOrdinal(d3.schemeCategory10);
};
