
// src/app/page.tsx (or src/pages/index.tsx)
"use client";

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

// Your existing imports for HomePage content
import { AppCategories } from '@/lib/types';
import { CategoryCard } from '@/components/category/CategoryCard'; // Your actual component
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPlus, Settings, Smartphone } from 'lucide-react'; // Updated icons
import WhyUsSection from '@/components/WhyUsSection';
import TestimonialsSection from '@/components/TestimonialsSection';
import SecondaryCTASection from '@/components/SecondaryCTASection';
// Logo is no longer imported here as it was removed from the hero

export default function HomePage() {
  const [selectedService, setSelectedService] = useState('');

  const handleCategorySelect = (serviceName: string) => {
    setSelectedService(serviceName);
    const heroElement = document.getElementById('hero-section'); // Ensure your Hero section component has this ID
    if (heroElement) {
      heroElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const howItWorksSteps = [
    {
      step: "1",
      title: "Εγγραφή",
      description: "Δημιουργήστε τον λογαριασμό σας γρήγορα και εύκολα για να ξεκινήσετε.",
      icon: <UserPlus className="h-8 w-8 md:h-10 md:w-10 text-app-teal" />,
      isHighlighted: true,
    },
    {
      step: "2",
      title: "Επιλογή & Ρύθμιση",
      description: "Βρείτε την υπηρεσία ή το κέντρο που σας ταιριάζει και προσαρμόστε τις επιλογές σας.",
      icon: <Settings className="h-8 w-8 md:h-10 md:w-10 text-app-teal" />,
    },
    {
      step: "3",
      title: "Χρήση Εφαρμογής",
      description: "Αξιοποιήστε τις λειτουργίες της πλατφόρμας για ραντεβού και επικοινωνία.",
      icon: <Smartphone className="h-8 w-8 md:h-10 md:w-10 text-app-teal" />,
    },
  ];

  const YourHeroSectionComponent = ({ currentSelectedService }: { currentSelectedService: string }) => {
    const [heroSearchInput, setHeroSearchInput] = useState('');
    useEffect(() => {
      if (currentSelectedService) { setHeroSearchInput(currentSelectedService); }
    }, [currentSelectedService]);
    const handleHeroSearch = (e: React.FormEvent) => { e.preventDefault(); alert(`Αναζήτηση από Hero για: ${heroSearchInput}`); };
    return (
      <section
        id="hero-section"
        className="bg-vivid-blue -mx-4 sm:-mx-6 lg:-mx-8 -mt-24 pt-24 md:pt-28 pb-12 md:pb-16"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="mt-3 text-lg text-white md:text-xl font-sans">Όλες οι <strong>Ειδικότητες</strong> αυτοκινήτου με ένα <strong>Click</strong></p>
          <form
            onSubmit={handleHeroSearch}
            className="mt-6 max-w-md mx-auto flex items-center gap-0.5 p-1 bg-white rounded-full shadow-md focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 transition-all border-2 border-transparent hover:border-sky-300"
          >
            <input
              type="text"
              value={heroSearchInput}
              onChange={(e) => setHeroSearchInput(e.target.value)}
              placeholder="π.χ., Αλλαγή λαδιών..."
              className="flex-grow h-10 px-4 bg-transparent border-none focus:outline-none text-slate-800 font-sans placeholder:text-muted-foreground"
            />
            <button
              type="submit"
              className="bg-[#FFA500] text-white hover:bg-[#FFB733] focus:outline-none font-sans h-10 px-5 rounded-full shadow-sm transition-all duration-150 ease-in-out"
            >
              Αναζήτηση
            </button>
          </form>
        </div>
      </section>
    );
  };

  const YourCategoriesSectionComponent = ({ onCategorySelect }: { onCategorySelect: (serviceName: string) => void }) => {
    return (
      <div className="my-8 p-4 bg-[#f3f5ff] rounded-lg shadow">
        <h2 className="text-2xl font-bold text-center mb-6 text-contentTitle font-sans">Εξερεύνηση Κατηγοριών</h2>
        {AppCategories.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-6 max-w-2xl mx-auto">
            {AppCategories.map((category, index) => {
              let wrapperClasses = "flex justify-center";
              if (AppCategories.length === 7 && index === 6) {
                wrapperClasses += " sm:col-start-2";
              }
              return (
                <div key={category.slug + "-wrapper"} onClick={() => onCategorySelect(category.translatedName || category.slug)} className={wrapperClasses}>
                  <CategoryCard categorySlug={category.slug} translatedCategoryName={category.translatedName} description={category.description} iconName={category.icon} />
                </div>
              );
            })}
          </div>
        ) : ( <p className="text-center text-muted-foreground font-sans">Δεν Βρέθηκαν Κατηγορίες</p> )}
      </div>
    );
  };

  return (
        <div className="space-y-6">

      <YourHeroSectionComponent currentSelectedService={selectedService} />

      <section className="py-12 md:py-16">
        <h2 className="text-3xl font-bold text-center mb-4 text-contentTitle font-sans">Μάθετε Περισσότερα για τη Διαδικασία μας</h2>
        <p className="text-lg text-center text-contentText mb-12 max-w-2xl mx-auto">
          Ανακαλύψτε πόσο εύκολο είναι να βρείτε την κατάλληλη υπηρεσία και να κλείσετε το ραντεβού σας.
        </p>
        <div className="flex flex-col md:flex-row items-start justify-center md:gap-x-4 lg:gap-x-8 gap-y-10">
          {howItWorksSteps.map((item, index) => (
            <React.Fragment key={item.step}>
              <div className="flex flex-col items-center text-center w-full md:max-w-[220px] lg:max-w-xs px-2">
                <div className="text-xs font-semibold text-gray-500 mb-2">ΒΗΜΑ {item.step}</div>
                <div className={cn(
                  "relative rounded-full w-24 h-24 md:w-28 md:h-28 flex items-center justify-center mb-4",
                  item.isHighlighted ? "bg-white shadow-xl" : "bg-transparent border-2 border-dashed border-gray-300"
                )}>
                  {item.isHighlighted ? (
                    <div className="bg-app-teal/10 rounded-full p-3">
                      {item.icon}
                    </div>
                  ) : (
                    item.icon
                  )}
                </div>
                <h3 className="text-xl font-bold text-contentTitle mb-2">{item.title}</h3>
                <p className="text-sm text-contentText">{item.description}</p>
              </div>

              {index < howItWorksSteps.length - 1 && (
                <div className="hidden md:flex items-center justify-center self-center mt-[-4rem] lg:mt-[-5rem] mx-2 lg:mx-4">
                  <svg width="100" height="30" viewBox="0 0 100 30" className="text-gray-400">
                    <path d="M5 15 Q 50 -5, 95 15" stroke="currentColor" strokeWidth="2" fill="none" strokeDasharray="4,4" />
                  </svg>
                </div>
              )}
              {index < howItWorksSteps.length - 1 && (
                <div className="md:hidden flex items-center justify-center my-6 w-full">
                  <div className="h-12 w-px bg-gray-300 border-dashed"></div>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </section>
      <YourCategoriesSectionComponent onCategorySelect={handleCategorySelect} />
      <WhyUsSection />
      <TestimonialsSection />
      <SecondaryCTASection />
    </div>
  );
}
