import Header from './Header';
import Footer from './Footer';

export default function Layout({ children, currentView }) {
    return (
        <div className="flex flex-col min-h-screen bg-brand-bg dark:bg-slate-950 font-sans text-slate-700 dark:text-slate-200 selection:bg-brand-primary/10 selection:text-brand-primary transition-colors duration-300">
            <Header currentView={currentView} />
            <main className="flex-grow pb-24">
                {children}
            </main>
            <Footer />
        </div>
    );
}
