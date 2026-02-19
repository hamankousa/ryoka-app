import { useMemo } from "react";
import { SvgXml } from "react-native-svg";

import { ICONIFY_XML, IconifyIconName } from "./iconifyXml";

type Props = {
  name: IconifyIconName;
  size: number;
  color: string;
};

export function IconifyIcon({ name, size, color }: Props) {
  const xml = ICONIFY_XML[name];
  const tintedXml = useMemo(() => xml.replace(/currentColor/g, color), [color, xml]);
  return <SvgXml xml={tintedXml} width={size} height={size} />;
}
