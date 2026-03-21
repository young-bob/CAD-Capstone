import { useState } from 'react';
import { Search, MapPin, User, Sparkles, ChevronRight, X } from 'lucide-react';
import type { ViewName } from '../types';

interface Props {
    onDone: (navigateTo?: ViewName) => void;
}

const STEPS = [
    {
        icon: Sparkles,
        gradient: 'from-amber-400 to-orange-500',
        title: 'Welcome to VSMS!',
        description: "You're all set. Let's take a quick tour so you can hit the ground running.",
        hint: null,
    },
    {
        icon: User,
        gradient: 'from-violet-400 to-purple-500',
        title: 'Complete Your Profile',
        description: 'A complete profile helps coordinators find you for the right opportunities. Add your skills, bio, and location.',
        hint: 'Go to Profile → My Skills to add what you know.',
    },
    {
        icon: Search,
        gradient: 'from-blue-400 to-cyan-500',
        title: 'Find Opportunities',
        description: 'Browse events near you, filter by skills or date, and apply with one click. Your applications are tracked automatically.',
        hint: 'Use the "Find Opportunities" page in the sidebar.',
    },
    {
        icon: MapPin,
        gradient: 'from-emerald-400 to-teal-500',
        title: 'Log Hours with Geo Check-in',
        description: 'When you arrive at a volunteer event, use Geo Check-in to automatically verify your attendance and log hours.',
        hint: 'The system uses your location — allow location access when prompted.',
    },
];

export default function OnboardingModal({ onDone }: Props) {
    const [step, setStep] = useState(0);
    const isLast = step === STEPS.length - 1;
    const current = STEPS[step];
    const IconComp = current.icon;

    const handleNext = () => {
        if (isLast) {
            onDone('opportunities');
        } else {
            setStep(s => s + 1);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={() => onDone()}
            />

            {/* Modal */}
            <div
                className="relative w-full max-w-sm bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl overflow-hidden animate-content-reveal"
                key={step}
            >
                {/* Skip button */}
                <button
                    onClick={() => onDone()}
                    className="absolute top-4 right-4 z-10 p-1.5 rounded-xl text-stone-300 hover:text-stone-500 hover:bg-stone-100 transition-colors"
                    title="Skip tour"
                >
                    <X className="w-4 h-4" />
                </button>

                {/* Coloured header */}
                <div className={`bg-gradient-to-br ${current.gradient} p-8 flex flex-col items-center`}>
                    <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/30 mb-4">
                        <IconComp className="w-8 h-8 text-white" />
                    </div>
                    {/* Progress dots */}
                    <div className="flex gap-1.5">
                        {STEPS.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setStep(i)}
                                className={`h-1.5 rounded-full transition-all duration-300 ${
                                    i === step ? 'w-6 bg-white' : 'w-1.5 bg-white/40'
                                }`}
                            />
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    <h2 className="text-lg font-bold text-stone-800 dark:text-zinc-100 mb-2">{current.title}</h2>
                    <p className="text-sm text-stone-500 dark:text-zinc-400 leading-relaxed mb-4">{current.description}</p>

                    {current.hint && (
                        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50 rounded-xl px-4 py-3 text-xs text-amber-700 dark:text-amber-400 font-medium mb-4">
                            💡 {current.hint}
                        </div>
                    )}

                    <div className="flex items-center gap-3">
                        {step > 0 && (
                            <button
                                onClick={() => setStep(s => s - 1)}
                                className="flex-1 py-2.5 rounded-xl border border-stone-200 dark:border-zinc-700 text-stone-500 dark:text-zinc-400 text-sm font-medium hover:bg-stone-50 dark:hover:bg-zinc-800 transition-colors"
                            >
                                Back
                            </button>
                        )}
                        <button
                            onClick={handleNext}
                            className={`flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-sm font-bold transition-all shadow-sm shadow-orange-500/25 flex items-center justify-center gap-1.5`}
                        >
                            {isLast ? 'Start Exploring' : 'Next'}
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    <p className="text-center text-[11px] text-stone-300 dark:text-zinc-600 mt-3">
                        Step {step + 1} of {STEPS.length}
                    </p>
                </div>
            </div>
        </div>
    );
}
