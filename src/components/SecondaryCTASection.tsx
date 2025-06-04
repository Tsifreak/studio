
"use client"; 

import React from 'react';

const SecondaryCTASection: React.FC = () => {
  const handleCTAClick = () => {
    // This could navigate to a specific page, or scroll to the top hero search
    const heroElement = document.getElementById('hero-section'); // Ensure your Hero has this ID
    if (heroElement) {
      heroElement.scrollIntoView({ behavior: 'smooth' });
      // Optionally, focus the search input in the hero
      const searchInput = heroElement.querySelector('input[type="text"]') as HTMLInputElement | null;
      if (searchInput) {
        searchInput.focus();
      }
    } else {
      // Fallback if hero section isn't found, e.g., navigate to a search page
      // router.push('/search'); // If using Next.js router
      alert('Πλοηγηθείτε στην αναζήτηση.');
    }
  };

  return (
    <section id="secondary-cta" className="py-12 md:py-16 bg-[#f8f8f8] rounded-lg shadow"> {/* Changed bg-card to bg-[#f8f8f8] */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-contentTitle">
          Έτοιμοι να ζήσετε την εμπειρία της εύκολης επισκευής;
        </h2>
        <p className="text-lg text-contentText mt-4 mb-8 max-w-xl mx-auto">
          Σταματήστε να ανησυχείτε για το αυτοκίνητό σας. Αφήστε το δίκτυο των αξιόπιστων επαγγελματιών μας να το φροντίσει.
        </p>
        <button
          onClick={handleCTAClick}
          className="bg-[#ff9300] text-white px-8 py-3 sm:px-10 sm:py-4 rounded-lg font-bold text-lg sm:text-xl hover:bg-[#e68300] transition-transform hover:scale-105 shadow-md"
        >
          Βρείτε Μηχανικό Τώρα
        </button>
      </div>
    </section>
  );
};

export default SecondaryCTASection;

