type Props = React.ImgHTMLAttributes<HTMLImageElement>;

export default function Image(props: Readonly<Props>) {
  // Add tailwind "text-transparent" to make the alt text invisible.
  const { className, ...rest } = props;

  // eslint-disable-next-line jsx-a11y/alt-text
  return <img {...rest} className={`text-transparent ${className}`} />;
}
