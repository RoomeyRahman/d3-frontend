// Utility functions for calculating boxplot statistics

export interface DataPoint {
  source: string
  target: string
  value: number
}

export interface BoxplotStats {
  category: string
  min: number
  q1: number
  median: number
  q3: number
  max: number
  outliers: number[]
  values: number[]
}

/**
 * Calculate quartiles and statistics for boxplot
 */
function calculateQuartiles(values: number[]): {
  q1: number
  median: number
  q3: number
} {
  const sorted = [...values].sort((a, b) => a - b)
  const n = sorted.length

  const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)]

  const q1Index = Math.floor(n / 4)
  const q1 = sorted[q1Index]

  const q3Index = Math.floor((3 * n) / 4)
  const q3 = sorted[q3Index]

  return { q1, median, q3 }
}

/**
 * Identify outliers using IQR method
 */
function identifyOutliers(values: number[], q1: number, q3: number): number[] {
  const iqr = q3 - q1
  const lowerBound = q1 - 1.5 * iqr
  const upperBound = q3 + 1.5 * iqr

  return values.filter((v) => v < lowerBound || v > upperBound)
}

/**
 * Process raw data and group by source to create boxplot statistics
 */
export function processBoxplotData(data: DataPoint[]): BoxplotStats[] {
  // Group values by source
  const groupedBySource = new Map<string, number[]>()

  data.forEach((item) => {
    if (!groupedBySource.has(item.source)) {
      groupedBySource.set(item.source, [])
    }
    groupedBySource.get(item.source)!.push(item.value)
  })

  // Calculate statistics for each group
  const stats: BoxplotStats[] = []

  groupedBySource.forEach((values, category) => {
    if (values.length === 0) return

    const sorted = [...values].sort((a, b) => a - b)
    const { q1, median, q3 } = calculateQuartiles(values)
    const outliers = identifyOutliers(values, q1, q3)

    stats.push({
      category,
      min: Math.min(...sorted.filter((v) => !outliers.includes(v))),
      q1,
      median,
      q3,
      max: Math.max(...sorted.filter((v) => !outliers.includes(v))),
      outliers,
      values,
    })
  })

  // Sort by median for better visualization
  return stats.sort((a, b) => a.median - b.median)
}
