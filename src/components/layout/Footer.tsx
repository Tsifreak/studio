
export function Footer() {
  return (
    <footer className="border-t py-8 bg-background">
      <div className="container text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} Amaxakis. All rights reserved.</p>
        <p className="mt-1">Your central hub for discovering car repair services.</p>
      </div>
    </footer>
  );
}

