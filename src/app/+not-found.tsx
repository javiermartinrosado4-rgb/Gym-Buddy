import { router } from "expo-router";
import { Button, Heading, Page } from "../components/ui";
export default function NotFound() {
  return (
    <Page>
      <Heading title="Volvamos a tu plan" subtitle="Esta página no existe." />
      <Button label="Ir al inicio" onPress={() => router.replace("/")} />
    </Page>
  );
}
