# TimeNest Alarm Clock

Build a polished, mobile-first alarm clock web app called "TimeNest" using the default Lovable stack (React, TypeScript, Tailwind, shadcn/ui). Focus on a working frontend prototype with persistent alarms in localStorage and accurate time calculations. Do not add login or paid integrations.

Core requirements:
1. Main screen displays current local time/date and a list of alarms with clear enabled/disabled states. Include a prominent "New Alarm" button.
2. Clicking New Alarm opens a dialog/page with exactly two alarm creation modes:
   A. "After a duration": let the user enter a relative duration using days, hours, and minutes (e.g. 2 days, 3 hours, 10 minutes from now). Show the calculated local date/time before saving.
   B. "Choose date & time": let the user select a calendar date and clock time (e.g. October 28 at 5:00 PM). Validate that the chosen date/time is in the future.
3. Custom snooze: each alarm has a fully custom snooze duration with day, hour, and minute fields. Support very large values without artificial product limits, including examples such as 3 days, 7 days, or 1 month + 5 days + 4 hours. To handle months clearly, provide an optional months field in addition to days/hours/minutes, and calculate snooze by calendar-month addition followed by days/hours/minutes (document this behavior in UI). Do not silently impose arbitrary maximums; do validate safe numeric input.
4. When an alarm time arrives while the app is open, show a full-screen ringing state/modal with the alarm label/time, sound using Web Audio or a suitable browser-supported approach, and buttons for Stop and Snooze. Snooze should schedule the next ring using that alarm's custom duration and support repeated snoozes. Include a clear note that browsers may not reliably ring when the app/browser is closed or the device is asleep; don't claim native alarm reliability.
5. Allow creating, editing, deleting, enabling/disabling alarms. Show next ring time and custom snooze duration in the list. Persist alarm settings and pending snooze state in localStorage. Handle page visibility/resume by checking for alarms that became due while the tab was backgrounded.
6. Make it responsive and accessible, with a premium modern clock aesthetic: dark navy background, soft violet/blue accents, large readable digital clock, subtle gradients, clean cards, polished modal forms, keyboard accessibility, and clear validation/error messages.
7. Add sensible empty states and sample-friendly UI without creating fake active alarms by default. Use browser local time zone. Keep code organized into reusable components and verify the app builds.

Important: this is a web app prototype, not a native Android/iOS alarm app. Clearly communicate browser background limitations in the interface.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://timenest-alarm-clock.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/8d2037c9-4f7e-4da2-ab60-c0f5a58c91d6).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
