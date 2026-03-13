import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface MiniCalendarProps {
    eventDates: Date[]; // Dates that have events (shifts, etc.)
    onDateClick?: (date: Date) => void;
}

export function MiniCalendar({ eventDates, onDateClick }: MiniCalendarProps) {
    const [currentDate, setCurrentDate] = useState(new Date());

    const navPrev = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const navNext = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const dayNames = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

    // Helper to check if a specific day has an event
    const hasEvent = (day: number) => {
        return eventDates.some(ed => 
            ed.getDate() === day && 
            ed.getMonth() === currentDate.getMonth() && 
            ed.getFullYear() === currentDate.getFullYear()
        );
    };

    const isToday = (day: number) => {
        const today = new Date();
        return day === today.getDate() && 
               currentDate.getMonth() === today.getMonth() && 
               currentDate.getFullYear() === today.getFullYear();
    };

    const renderGrid = () => {
        const grid = [];
        let dayCounter = 1;

        // Create 6 rows maximum to cover any month's layout
        for (let row = 0; row < 6; row++) {
            const cells = [];
            for (let col = 0; col < 7; col++) {
                if (row === 0 && col < firstDayOfMonth) {
                    // Empty cells before month starts
                    cells.push(<div key={`empty-${col}`} className="h-10 w-10"></div>);
                } else if (dayCounter > daysInMonth) {
                    // Empty cells after month ends
                    cells.push(<div key={`empty-end-${dayCounter}`} className="h-10 w-10"></div>);
                    dayCounter++;
                } else {
                    const currentDay = dayCounter;
                    const eventOccurs = hasEvent(currentDay);
                    const today = isToday(currentDay);
                    
                    cells.push(
                        <div 
                            key={`day-${currentDay}`} 
                            onClick={() => onDateClick?.(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDay))}
                            className={`h-10 w-10 flex flex-col items-center justify-center rounded-full text-sm cursor-pointer transition-all
                                ${today ? 'bg-orange-500 text-white font-bold shadow-md shadow-orange-500/30' : 'text-stone-700 hover:bg-orange-50'}
                                ${eventOccurs && !today ? 'font-extrabold text-orange-600' : ''}
                            `}
                        >
                            <span>{currentDay}</span>
                            {eventOccurs && (
                                <div className={`w-1.5 h-1.5 rounded-full mt-0.5 ${today ? 'bg-white' : 'bg-orange-500'}`}></div>
                            )}
                        </div>
                    );
                    dayCounter++;
                }
            }
            grid.push(<div key={`row-${row}`} className="flex justify-between">{cells}</div>);
            if (dayCounter > daysInMonth) break; // Stop rendering extra empty rows
        }
        return grid;
    };

    return (
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-100 w-full max-w-sm">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <button onClick={navPrev} className="p-2 rounded-full hover:bg-stone-100 text-stone-500 transition-colors">
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="font-extrabold text-stone-800 text-lg">
                    {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </div>
                <button onClick={navNext} className="p-2 rounded-full hover:bg-stone-100 text-stone-500 transition-colors">
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>

            {/* Weekdays */}
            <div className="flex justify-between mb-2">
                {dayNames.map(day => (
                    <div key={day} className="w-10 text-center text-xs font-bold text-stone-400 uppercase">
                        {day}
                    </div>
                ))}
            </div>

            {/* Grid */}
            <div className="space-y-1">
                {renderGrid()}
            </div>
        </div>
    );
}
