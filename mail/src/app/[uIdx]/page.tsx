export default async function Page(props: {
  params: Promise<{ uIdx: string }>;
}) {
  const params = await props.params;
  const uIdx = params.uIdx;

  return (
    <div>
      <h1>Page {uIdx}</h1>
      <p>Welcome to the page!</p>
    </div>
  );
}
