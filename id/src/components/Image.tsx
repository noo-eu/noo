import NextImage, { getImageProps } from "next/image";

type Props = React.ComponentProps<typeof NextImage>;

export default function Image(props: Props) {
  const { props: newProps } = getImageProps(props);

  // Remove style="color: transparent" as it breaks CSP.
  const { style: _omit, ...rest } = newProps;

  // But add tailwind "text-transparent" to make the alt text invisible.
  rest.className = `text-transparent ${rest.className}`;

  // eslint-disable-next-line @next/next/no-img-element
  return <img {...rest} />;
}
