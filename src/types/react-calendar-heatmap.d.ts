declare module 'react-calendar-heatmap' {
  import * as React from 'react';

  export interface HeatmapValue {
    date: string | Date | number;
    [key: string]: any;
  }

  export interface Props {
    values: HeatmapValue[];
    startDate?: string | Date | number;
    endDate?: string | Date | number;
    numDays?: number;
    gutterSize?: number;
    horizontal?: boolean;
    showMonthLabels?: boolean;
    showWeekdayLabels?: boolean;
    showOutOfRangeDays?: boolean;
    monthLabels?: string[];
    weekdayLabels?: string[];
    classForValue?: (value: HeatmapValue | null) => string;
    titleForValue?: (value: HeatmapValue | null) => string;
    tooltipDataAttrs?: (value: HeatmapValue | null) => object;
    onClick?: (value: HeatmapValue | null) => void;
    onMouseOver?: (event: React.MouseEvent, value: HeatmapValue | null) => void;
    onMouseLeave?: (event: React.MouseEvent, value: HeatmapValue | null) => void;
    transformDayElement?: (element: React.ReactElement, value: HeatmapValue | null, index: number) => React.ReactElement;
    className?: string;
  }

  const CalendarHeatmap: React.FC<Props>;

  export default CalendarHeatmap;
}
