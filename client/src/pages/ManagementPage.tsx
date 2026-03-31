interface Props {
  title: string;
  description: string;
}

function ManagementPage({ title, description }: Props) {
  return (
    <section className="panel management-page">
      <p className="eyebrow">Coming Next</p>
      <h2>{title}</h2>
      <p className="management-page__text">{description}</p>
    </section>
  );
}

export default ManagementPage;
