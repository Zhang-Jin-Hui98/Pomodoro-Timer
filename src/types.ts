/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Task {
  id: string;
  title: string;
  isActive: boolean;
  isCompleted: boolean;
  createdAt: number;
}

export type TimerMode = 'focus' | 'short' | 'long';

export type TimerStatus = 'idle' | 'running' | 'paused';

export interface CustomSettings {
  focusTime: number; // in minutes
  shortBreakTime: number; // in minutes
  longBreakTime: number; // in minutes
  tickTock: boolean;
}
