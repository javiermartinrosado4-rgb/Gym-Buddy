import { router } from "expo-router";
import { Button, Card, Heading, Page, Pill, Txt } from "../components/ui";
import { useStore } from "../state/Store";
export default function Community() {
  const { state } = useStore();
  return <Page>
    <Heading eyebrow="Comunidad" title="Crecer juntos" subtitle="Tu futuro espacio para compartir el progreso." />
    <Card>
      <Txt weight="600" size={22}>{state.profile.name || "Tu perfil"}</Txt>
      <Txt muted>{state.profile.handle ? `@${state.profile.handle}` : "Añade tu nombre y @ desde Perfil."}</Txt>
      <Button label="Editar mi perfil" variant="secondary" onPress={() => router.replace("/profile")} />
    </Card>
    <Card>
      <Pill>Próximamente</Pill>
      <Txt weight="600">Amigos y fotos de progreso</Txt>
      <Txt muted>Podrás agregar a otras personas por su @ y elegir si compartes tus fotos en público o de forma privada con tus contactos.</Txt>
      <Txt size={13} muted>La búsqueda, las publicaciones y las cuentas todavía no están disponibles. Ahora todos tus datos son locales y no se publica ninguna foto.</Txt>
    </Card>
  </Page>;
}
