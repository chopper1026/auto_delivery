export function PageTitle({ title, description }: { title: string; description: string }) {
  return (
    <header className="page-title">
      <h1>{title}</h1>
      <p>{description}</p>
    </header>
  );
}

