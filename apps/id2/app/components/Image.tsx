type Props = React.ImgHTMLAttributes<HTMLImageElement>;

export default function Image(props: Readonly<Props>) {
  // But add tailwind "text-transparent" to make the alt text invisible.
  const { className, ...rest } = props;

  return <img {...rest} className={`text-transparent ${className}`} />;
}
