import { Heart, Sun, ChevronRight, CheckCircle2, Award, ShieldCheck, MapPin, Clock, Users, Briefcase, FileCheck } from 'lucide-react';

interface Props {
    onGoLogin: () => void;
}

export default function LandingPage({ onGoLogin }: Props) {
    return (
        <div className="min-h-screen bg-orange-50/30 flex flex-col font-sans">
            <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Heart className="h-8 w-8 text-rose-500 fill-rose-500" />
                        <span className="text-xl font-bold text-stone-900 tracking-tight">VSMS</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <button onClick={onGoLogin} className="text-stone-600 hover:text-orange-500 font-medium transition-colors">Log In</button>
                        <button onClick={onGoLogin} className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2 rounded-full font-medium transition-colors shadow-sm">Join Now</button>
                    </div>
                </div>
            </header>

            <main className="flex-grow">
                {/* ─── Hero Section ─── */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 flex flex-col lg:flex-row items-center gap-12">
                    <div className="lg:w-1/2 flex flex-col items-start text-left">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-700 font-semibold text-sm mb-6 shadow-sm border border-amber-200">
                            <Sun className="w-4 h-4 text-amber-500 animate-spin-slow" />
                            VSMS V1.0 is spreading hope
                        </div>
                        <h1 className="text-4xl lg:text-6xl font-extrabold text-stone-900 leading-tight mb-6">
                            Empower care, making volunteering <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-500">brighter</span>
                        </h1>
                        <p className="text-lg text-stone-600 mb-8 max-w-lg leading-relaxed">
                            An all-in-one volunteer service management platform. From publishing opportunities and smart matching to real-time geo-attendance and automated certificate generation.
                        </p>
                        <div className="flex gap-4">
                            <button onClick={onGoLogin} className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-full text-lg font-semibold transition-all shadow-lg hover:shadow-orange-500/40 flex items-center gap-2">
                                Get Started <ChevronRight className="w-5 h-5" />
                            </button>
                            <button className="bg-white hover:bg-orange-50 text-stone-700 border border-stone-200 px-8 py-3 rounded-full text-lg font-semibold transition-all shadow-sm">
                                Learn More
                            </button>
                        </div>
                    </div>
                    <div className="lg:w-1/2 relative w-full">
                        <div className="aspect-[4/3] rounded-3xl bg-gradient-to-tr from-orange-100 to-amber-50 flex items-center justify-center p-8 relative overflow-hidden shadow-2xl border border-white">
                            <div className="absolute top-8 left-8 bg-white p-4 rounded-2xl shadow-lg animate-bounce" style={{ animationDuration: '3s' }}>
                                <div className="flex items-center gap-3">
                                    <div className="bg-emerald-100 p-2 rounded-full"><CheckCircle2 className="w-6 h-6 text-emerald-600" /></div>
                                    <div>
                                        <p className="text-xs text-stone-500">Check-in Success</p>
                                        <p className="font-bold text-stone-800">4 Hours Logged</p>
                                    </div>
                                </div>
                            </div>
                            <div className="absolute bottom-8 right-8 bg-white p-4 rounded-2xl shadow-lg animate-bounce" style={{ animationDuration: '4s', animationDelay: '1s' }}>
                                <div className="flex items-center gap-3">
                                    <div className="bg-amber-100 p-2 rounded-full"><Award className="w-6 h-6 text-amber-600" /></div>
                                    <div>
                                        <p className="text-xs text-stone-500">New Certificate</p>
                                        <p className="font-bold text-stone-800">Light Bringer</p>
                                    </div>
                                </div>
                            </div>
                            {/* Inline illustration — volunteer hands + heart */}
                            <div className="flex flex-col items-center gap-4 relative z-10">
                                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-orange-300 to-amber-200 flex items-center justify-center shadow-inner">
                                    <Heart className="w-16 h-16 text-white fill-white drop-shadow-md" />
                                </div>
                                <div className="flex gap-2">
                                    <span className="px-3 py-1 bg-white/80 rounded-full text-xs font-bold text-orange-600 shadow-sm">Volunteer</span>
                                    <span className="px-3 py-1 bg-white/80 rounded-full text-xs font-bold text-emerald-600 shadow-sm">Connect</span>
                                    <span className="px-3 py-1 bg-white/80 rounded-full text-xs font-bold text-blue-600 shadow-sm">Impact</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ─── How It Works ─── */}
                <div className="bg-white py-20">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl lg:text-4xl font-extrabold text-stone-900 mb-4">How It Works</h2>
                            <p className="text-lg text-stone-500 max-w-2xl mx-auto">Three simple steps to start your volunteer journey</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {[
                                { step: '01', title: 'Sign Up & Create Profile', desc: 'Register as a volunteer, coordinator, or organization admin. Set up your skills and preferences.', color: 'from-amber-400 to-orange-500' },
                                { step: '02', title: 'Discover & Apply', desc: 'Browse published opportunities, use smart matching to find the best fit, and submit applications.', color: 'from-orange-500 to-rose-500' },
                                { step: '03', title: 'Check-in & Earn Certificates', desc: 'Validate attendance with geo-location, log hours automatically, and receive digital certificates.', color: 'from-rose-500 to-pink-500' },
                            ].map((item, idx) => (
                                <div key={idx} className="relative group">
                                    <div className={`absolute -top-4 -left-2 w-14 h-14 rounded-2xl bg-gradient-to-br ${item.color} text-white flex items-center justify-center font-extrabold text-xl shadow-lg group-hover:scale-110 transition-transform`}>{item.step}</div>
                                    <div className="bg-stone-50 rounded-3xl p-8 pt-14 border border-stone-100 hover:shadow-lg transition-shadow h-full">
                                        <h3 className="text-xl font-bold text-stone-800 mb-3">{item.title}</h3>
                                        <p className="text-stone-500 leading-relaxed">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ─── Platform Features ─── */}
                <div className="py-20">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl lg:text-4xl font-extrabold text-stone-900 mb-4">Platform Features</h2>
                            <p className="text-lg text-stone-500 max-w-2xl mx-auto">Everything you need to manage volunteer services effectively</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {[
                                { icon: Briefcase, title: 'Opportunity Management', desc: 'Create, publish, and manage volunteer opportunities with shifts and capacity control.', color: 'text-blue-500', bg: 'bg-blue-50' },
                                { icon: Users, title: 'Smart Matching', desc: 'AI-driven skill matching to connect the right volunteers with the right opportunities.', color: 'text-amber-500', bg: 'bg-amber-50' },
                                { icon: MapPin, title: 'Geo-Attendance', desc: 'Real-time location validation for check-in/check-out with proof of attendance.', color: 'text-emerald-500', bg: 'bg-emerald-50' },
                                { icon: FileCheck, title: 'Auto Certificates', desc: 'Generate and issue digital certificates automatically upon completion of volunteer hours.', color: 'text-rose-500', bg: 'bg-rose-50' },
                                { icon: ShieldCheck, title: 'Organization Control', desc: 'Full admin dashboard for managing organizations, users, and resolving disputes.', color: 'text-violet-500', bg: 'bg-violet-50' },
                                { icon: Clock, title: 'Hours Tracking', desc: 'Automatic calculation and tracking of volunteer hours with detailed reports.', color: 'text-cyan-500', bg: 'bg-cyan-50' },
                            ].map((feature, idx) => (
                                <div key={idx} className="bg-white rounded-3xl p-8 shadow-sm border border-stone-100 hover:shadow-xl hover:-translate-y-1 transition-all group">
                                    <div className={`w-14 h-14 rounded-2xl ${feature.bg} ${feature.color} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                                        <feature.icon className="w-7 h-7" />
                                    </div>
                                    <h3 className="text-lg font-bold text-stone-800 mb-2">{feature.title}</h3>
                                    <p className="text-stone-500 leading-relaxed">{feature.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ─── Stats Banner ─── */}
                <div className="bg-gradient-to-r from-amber-400 to-orange-500 py-16">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-white">
                            {[
                                { val: '10,000+', label: 'Volunteers' },
                                { val: '500+', label: 'Organizations' },
                                { val: '2,000+', label: 'Opportunities' },
                                { val: '50,000+', label: 'Hours Logged' },
                            ].map((stat, idx) => (
                                <div key={idx}>
                                    <h3 className="text-3xl lg:text-4xl font-extrabold">{stat.val}</h3>
                                    <p className="text-orange-100 font-semibold mt-1">{stat.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ─── Role-based Access Section ─── */}
                <div className="bg-white py-20">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl lg:text-4xl font-extrabold text-stone-900 mb-4">Built for Every Role</h2>
                            <p className="text-lg text-stone-500 max-w-2xl mx-auto">Tailored experiences for volunteers, coordinators, and administrators</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {[
                                { role: 'Volunteer', desc: 'Find opportunities, track hours, manage skills, earn certificates, and build your impact profile.', features: ['Opportunity Search', 'Geo Check-in', 'Skill Management', 'Certificate Collection'], color: 'from-amber-400 to-orange-500', icon: '🙋' },
                                { role: 'Coordinator', desc: 'Manage events, review applications, issue certificates, and track organizational metrics.', features: ['Event Management', 'Application Review', 'Certificate Templates', 'Org Dashboard'], color: 'from-orange-500 to-rose-500', icon: '👩‍💼' },
                                { role: 'System Admin', desc: 'Oversee the entire platform, approve organizations, manage users, and resolve disputes.', features: ['Org Approval', 'User Control', 'Dispute Resolution', 'Platform Analytics'], color: 'from-rose-500 to-pink-500', icon: '🛡️' },
                            ].map((item, idx) => (
                                <div key={idx} className="rounded-3xl overflow-hidden shadow-sm border border-stone-100 hover:shadow-xl transition-shadow group">
                                    <div className={`bg-gradient-to-r ${item.color} p-6 text-white`}>
                                        <span className="text-3xl mb-2 block">{item.icon}</span>
                                        <h3 className="text-xl font-bold">{item.role}</h3>
                                    </div>
                                    <div className="p-6 bg-white">
                                        <p className="text-stone-500 mb-4 leading-relaxed">{item.desc}</p>
                                        <ul className="space-y-2">
                                            {item.features.map((f, i) => (
                                                <li key={i} className="flex items-center gap-2 text-sm font-medium text-stone-700">
                                                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                                    {f}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ─── CTA Section ─── */}
                <div className="py-20">
                    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                        <h2 className="text-3xl lg:text-4xl font-extrabold text-stone-900 mb-4">Ready to Make a Difference?</h2>
                        <p className="text-lg text-stone-500 mb-8 max-w-2xl mx-auto">Join thousands of volunteers and organizations on VSMS and start creating positive change in your community today.</p>
                        <div className="flex justify-center gap-4">
                            <button onClick={onGoLogin} className="bg-orange-500 hover:bg-orange-600 text-white px-10 py-4 rounded-full text-lg font-bold transition-all shadow-lg hover:shadow-orange-500/40 flex items-center gap-2">
                                Start Volunteering <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="bg-white border-t border-stone-100 py-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <Heart className="h-5 w-5 text-rose-500 fill-rose-500" />
                        <span className="text-sm font-bold text-stone-700">VSMS</span>
                        <span className="text-sm text-stone-400 ml-2">© 2026 Volunteer Service Management System</span>
                    </div>
                    <div className="flex gap-6 text-sm text-stone-500">
                        <a href="#" className="hover:text-orange-500 transition-colors">Privacy</a>
                        <a href="#" className="hover:text-orange-500 transition-colors">Terms</a>
                        <a href="#" className="hover:text-orange-500 transition-colors">Contact</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
