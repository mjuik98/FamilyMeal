"use client";

import type { ComponentProps } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

type LazyCalendarProps = ComponentProps<typeof Calendar>;

export default function LazyCalendar(props: LazyCalendarProps) {
  return <Calendar {...props} />;
}
