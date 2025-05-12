
export function Footer() {
  return (
    <footer className="border-t py-8 bg-background">
      <div className="container text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Amaxakis. Με επιφύλαξη παντός δικαιώματος.</p>
        <p className="mt-1">Ο κεντρικός σας κόμβος για την ανακάλυψη υπηρεσιών επισκευής αυτοκινήτων.</p>
      </div>
    </footer>
  );
}

