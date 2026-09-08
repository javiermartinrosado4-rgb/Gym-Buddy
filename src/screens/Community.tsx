import { useEffect, useRef, useState } from "react";
import { Image, Modal, Pressable, View } from "react-native";
import { router } from "expo-router";
import { Button, Card, Field, Heading, Icon, Notice, Page, Pill, Row, Txt } from "../components/ui";
import { CommunityPhoto } from "../components/CommunityPhoto";
import { useStore } from "../state/Store";
import { useCommunity } from "../state/Community";
import { CommunityPost, CommunityUser, communityUrl, PostPage, PublishedProgress } from "../services/community";
import { levelName } from "../data/options";
import { useTheme } from "../theme";
import { GoogleSignIn } from "../components/GoogleSignIn";
import { Avatar, AvatarSelect } from "../components/Avatar";
import { exportProgress } from "../logic/sharing";

export default function Community() {
  const { user } = useCommunity();
  return <CommunityScreen key={user?.id ?? "guest"} />;
}

function CommunityScreen() {
  const { state } = useStore();
  const { user, token, ready, error: connectionError, authenticate, logout, request, refresh } = useCommunity();
  const { colors } = useTheme();
  const [register, setRegister] = useState(false);
  const [handle, setHandle] = useState(state.profile.handle ?? "");
  const [password, setPassword] = useState("");
  const [name, setName] = useState(state.profile.name ?? "");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState(state.profile.avatar ?? "mountain");
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState<"profile" | "all" | "following">("profile");
  const [profileId, setProfileId] = useState<string | null>(null);
  const [profile, setProfile] = useState<CommunityUser | null>(null);
  const [sharedProgress, setSharedProgress] = useState<PublishedProgress | null>(null);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [next, setNext] = useState<number | null>(null);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [composer, setComposer] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState("");
  const [query, setQuery] = useState("");
  const [people, setPeople] = useState<CommunityUser[] | null>(null);
  const generation = useRef(0);
  const owner = profileId ?? user?.id;
  const mine = owner === user?.id;
  const queryPath = `/posts?${tab === "profile" ? `user=${owner}` : tab === "following" ? "following=1" : ""}`;
  const activePost = posts.find(p => p.id === selected);

  useEffect(() => {
    const current = ++generation.current;
    if (!user) return;
    Promise.resolve().then(() => {
      if (generation.current !== current) return null;
      setPosts([]); setNext(null); setProfile(null); setSharedProgress(null); setSelected(null);
      setLoading(true); setError("");
      return Promise.all([request<PostPage>(queryPath), request<CommunityUser>(`/profiles/${owner}`)]);
    })
      .then(result => { if (result && generation.current === current) { const [page, person] = result; setPosts(page.posts); setNext(page.next); setProfile(person); } })
      .catch(error => { if (generation.current === current) setError(error.message); })
      .finally(() => { if (generation.current === current) setLoading(false); });
    return () => { generation.current = current + 1; };
  }, [owner, queryPath, request, revision, user]);

  const run = async (action: () => Promise<void>) => {
    if (busy) return;
    setBusy(true); setError(""); setMessage("");
    try { await action(); }
    catch (error) { setError((error as Error).message); }
    finally { setBusy(false); }
  };
  const openProfile = (id: string) => { setProfileId(id); setTab("profile"); setPeople(null); setSelected(null); setEditing(false); };
  const like = (post: CommunityPost) => run(async () => {
    await request(`/posts/${post.id}/like`, post.liked ? "DELETE" : "PUT");
    setPosts(list => list.map(p => p.id === post.id ? { ...p, liked: !p.liked, likes: p.likes + (p.liked ? -1 : 1) } : p));
  });
  const photoView = (post: CommunityPost) => <Image source={{ uri: `${communityUrl}/photos/${post.id}` }} accessibilityLabel={post.caption || `Foto de entrenamiento de @${post.handle}`} style={{ width: "100%", aspectRatio: 1, borderRadius: 12, backgroundColor: colors.soft }} resizeMode="contain" />;
  const updatePrivacy = (routinePublic: boolean, progressPublic: boolean) => run(async () => {
    if (progressPublic) await request("/progress/me", "PUT", exportProgress(state));
    else await request("/progress/me", "DELETE").catch(() => undefined);
    setProfile(await request<CommunityUser>("/me/privacy", "PATCH", { routinePublic, progressPublic }));
    await refresh();
    setMessage("Privacidad de Comunidad actualizada.");
  });
  const loadSharedProgress = () => run(async () => {
    if (!profile) return;
    setSharedProgress(await request<PublishedProgress>(`/profiles/${profile.id}/progress`));
  });
  const postDetails = (post: CommunityPost) => <>
    <Button label={`@${post.handle}`} variant="ghost" compact onPress={() => openProfile(post.userId)} />
    {photoView(post)}
    {!!post.caption && <Txt>{post.caption}</Txt>}
    <Txt muted size={12}>{new Date(post.created).toLocaleString("es")}</Txt>
    <Button label={`${post.liked ? "Quitar me gusta" : "Me gusta"} · ${post.likes}`} icon="heart" variant="secondary" disabled={busy} onPress={() => void like(post)} />
  </>;

  return <Page>
    <Heading eyebrow="Comunidad" title="Crecer juntos" subtitle="Entrena, comparte y encuentra tu gente." />
    {!user ? <>
      <Card>
        <Txt weight="600" size={22}>{state.profile.name || "Tu perfil"}</Txt>
        {!!state.profile.handle && <Txt muted>@{state.profile.handle}</Txt>}
        <Txt muted>Un perfil para tus fotos de gimnasio, tus avances y las personas que te inspiran.</Txt>
        <Button label="Editar mi perfil" variant="ghost" compact onPress={() => router.replace("/profile")} />
      </Card>
      {!!connectionError && <Notice error>{connectionError}</Notice>}
      {token ? <Button label="Reintentar conexión" onPress={() => void run(refresh)} /> : <Card>
        <GoogleSignIn />
        <Row style={{ flexWrap: "wrap" }}>
          <Button label="Iniciar sesión" compact variant={!register ? "primary" : "secondary"} onPress={() => { setRegister(false); setPassword(""); }} />
          <Button label="Crear cuenta" compact variant={register ? "primary" : "secondary"} onPress={() => { setRegister(true); setPassword(""); }} />
        </Row>
        {register && <Field label="Nombre público" value={name} onChangeText={setName} />}
        <Field label="Usuario de Comunidad" value={handle} onChangeText={setHandle} placeholder="tu_usuario" maxLength={24} />
        <Field label="Contraseña de Comunidad" value={password} onChangeText={setPassword} secure maxLength={128} placeholder="Mínimo 10 caracteres" />
        <Txt muted size={12}>Tu cuenta social tiene contraseña propia. Tu rutina e historial de entrenamiento siguen guardados en este dispositivo. El perfil y las fotos que publiques serán públicos.</Txt>
        <Button label={busy ? "Conectando…" : register ? "Crear mi cuenta de Comunidad" : "Entrar en Comunidad"} disabled={busy || !ready} onPress={() => void run(async () => {
          await authenticate(register, { handle, password, name, level: state.profile.level });
          setPassword("");
        })} />
      </Card>}
    </> : <>
      <Row style={{ flexWrap: "wrap" }}>
        <Button label="Mi perfil" compact variant={tab === "profile" && mine ? "primary" : "secondary"} onPress={() => openProfile(user.id)} />
        <Button label="Explorar" compact variant={tab === "all" ? "primary" : "secondary"} onPress={() => setTab("all")} />
        <Button label="Siguiendo" compact variant={tab === "following" ? "primary" : "secondary"} onPress={() => setTab("following")} />
      </Row>
      {tab === "profile" && profile && <Card>
        <Row>
          <Avatar id={profile.avatar} />
          <View style={{ flex: 1 }}><Txt size={23} weight="600">{profile.name}</Txt><Txt muted>@{profile.handle}</Txt></View>
        </Row>
        <Row style={{ justifyContent: "space-between", flexWrap: "wrap" }}>
          <Txt size={13}>{profile.posts} fotos</Txt><Txt size={13}>{profile.followers} seguidores</Txt><Txt size={13}>{profile.following} siguiendo</Txt>
        </Row>
        <Pill>{levelName(profile.level)}</Pill>
        {!!profile.bio && <Txt>{profile.bio}</Txt>}
        {mine ? <Button label="Editar perfil social" compact variant="secondary" onPress={() => { setName(profile.name); setBio(profile.bio); setAvatar(profile.avatar ?? "mountain"); setEditing(!editing); }} /> :
          <Button label={profile.followed ? "Dejar de seguir" : "Seguir"} disabled={busy} onPress={() => void run(async () => {
            setProfile(await request<CommunityUser>(`/follow/${profile.id}`, profile.followed ? "DELETE" : "PUT"));
          })} />}
        {!!profile.routineId && <Button
          label={mine ? "Ver mi rutina compartida" : `Ver rutina de @${profile.handle}`}
          icon="copy"
          compact
          variant="secondary"
          onPress={() => router.push({ pathname: "/shared-routine", params: { id: profile.routineId! } })}
        />}
        {!!profile.progressVisible && (!mine || !!profile.progressPublic) && <Button
          label={sharedProgress ? "Ocultar progreso" : mine ? "Ver mi progreso compartido" : `Ver progreso de @${profile.handle}`}
          icon="trending-up"
          compact
          variant="secondary"
          onPress={() => sharedProgress ? setSharedProgress(null) : void loadSharedProgress()}
        />}
        {sharedProgress && <Card style={{ padding: 14 }}>
          <Txt weight="600">Progreso compartido</Txt>
          <Txt muted size={13}>{sharedProgress.sessions} sesiones Â· {sharedProgress.sets} series registradas</Txt>
          {sharedProgress.exercises.length ? sharedProgress.exercises.map(exercise => <Txt key={exercise.id} size={13}>
            {exercise.name}: {exercise.weight} kg Ã— {exercise.reps}
          </Txt>) : <Txt muted size={13}>AÃºn no hay series con carga registradas.</Txt>}
        </Card>}
        {mine && <Card style={{ padding: 14 }}>
          <Txt weight="600">Privacidad de entrenamientos</Txt>
          <Txt muted size={13}>Solo las personas a las que sigues y que tambiÃ©n te siguen podrÃ¡n ver lo que actives.</Txt>
          <Button
            label={profile.routinePublic ? "Rutina: visible para seguidores mutuos" : "Rutina: privada"}
            compact
            variant={profile.routinePublic ? "primary" : "secondary"}
            disabled={busy}
            onPress={() => void updatePrivacy(!profile.routinePublic, !!profile.progressPublic)}
          />
          <Button
            label={profile.progressPublic ? "Progreso: visible para seguidores mutuos" : "Progreso: privado"}
            compact
            variant={profile.progressPublic ? "primary" : "secondary"}
            disabled={busy}
            onPress={() => void updatePrivacy(!!profile.routinePublic, !profile.progressPublic)}
          />
        </Card>}
        {editing && mine && <>
          <Field label="Nombre público" value={name} onChangeText={setName} />
          <Field label="Biografía" value={bio} onChangeText={setBio} maxLength={300} />
          <AvatarSelect value={avatar} onChange={setAvatar} />
          <Txt muted size={12}>Nivel actual del entrenamiento: {levelName(state.profile.level)}.</Txt>
          <Button label="Guardar perfil social" disabled={busy} onPress={() => void run(async () => {
            setProfile(await request<CommunityUser>("/me", "PATCH", { name, bio, avatar, level: state.profile.level }));
            setEditing(false); await refresh();
          })} />
        </>}
      </Card>}
      <Button label="Nueva publicación" icon="plus" onPress={() => { setComposer(true); setError(""); }} />
      {composer && <Card>
        <Txt weight="600" size={20}>Comparte tu entrenamiento</Txt>
        <CommunityPhoto onSelect={data => { setPhoto(data); setError(""); }} onError={setError} />
        {photo && <Image source={{ uri: photo }} accessibilityLabel="Vista previa de tu publicación" style={{ width: "100%", aspectRatio: 1, borderRadius: 12 }} resizeMode="contain" />}
        <Field label="Texto de la publicación" value={caption} onChangeText={setCaption} maxLength={1000} placeholder="Un pequeño avance también cuenta…" />
        <Txt muted size={12}>Se publicará como @{user.handle}. La foto y el texto serán públicos. Solo se suben al pulsar Publicar foto.</Txt>
        <Button label={busy ? "Publicando…" : "Publicar foto"} disabled={busy || !photo} onPress={() => void run(async () => {
          await request("/posts", "POST", { photo, caption });
          setPhoto(null); setCaption(""); setComposer(false); openProfile(user.id); setRevision(r => r + 1); setMessage("Foto publicada.");
        })} />
        <Button label="Cancelar publicación" disabled={busy} compact variant="ghost" onPress={() => { setComposer(false); setPhoto(null); setCaption(""); }} />
      </Card>}
      <Row style={{ justifyContent: "space-between", flexWrap: "wrap" }}><Txt weight="600" size={18}>{tab === "profile" ? "Publicaciones" : tab === "all" ? "El muro del gym" : "Tu gente"}</Txt><Button label="Actualizar publicaciones" compact variant="ghost" disabled={loading} onPress={() => setRevision(r => r + 1)} /></Row>
      {loading ? <Txt muted>Cargando publicaciones…</Txt> : posts.length === 0 ? <Card><Icon name="camera" size={28} /><Txt weight="600">Todavía no hay publicaciones aquí</Txt><Txt muted>{tab === "following" ? "Busca personas y síguelas para ver sus fotos." : "Las fotos compartidas aparecerán en este espacio."}</Txt></Card> : tab === "profile" ?
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
          {posts.map(post => <Pressable key={post.id} accessibilityRole="button" accessibilityLabel={`Abrir publicación: ${post.caption || post.handle}`} onPress={() => { setSelected(post.id); setConfirmDelete(false); setReporting(false); }} style={{ width: "32%", aspectRatio: 1 }}>
            <Image source={{ uri: `${communityUrl}/photos/${post.id}` }} style={{ width: "100%", height: "100%", borderRadius: 4 }} resizeMode="cover" />
          </Pressable>)}
        </View> : posts.map(post => <Card key={post.id}>{postDetails(post)}<Button label="Ver publicación" compact variant="ghost" onPress={() => { setSelected(post.id); setConfirmDelete(false); setReporting(false); }} /></Card>)}
      {next !== null && <Button label="Cargar más fotos" disabled={busy} variant="secondary" onPress={() => void run(async () => {
        const version = generation.current;
        const page = await request<PostPage>(`${queryPath}&offset=${next}`);
        if (version === generation.current) { setPosts(previous => [...previous, ...page.posts.filter(p => !previous.some(old => old.id === p.id))]); setNext(page.next); }
      })} />}
      <Card>
        <Field label="Buscar personas por @" value={query} onChangeText={setQuery} maxLength={24} />
        <Button label="Buscar personas" variant="secondary" compact disabled={busy} onPress={() => void run(async () => setPeople(await request<CommunityUser[]>(`/profiles?q=${encodeURIComponent(query)}`)))} />
        {people?.map(person => <Button key={person.id} label={`@${person.handle} · ${person.name}`} variant="ghost" compact onPress={() => openProfile(person.id)} />)}
        {people?.length === 0 && <Txt muted>No hay perfiles con ese @.</Txt>}
      </Card>
      <Button label="Cerrar sesión de Comunidad" compact variant="ghost" disabled={busy} onPress={() => void run(logout)} />
    </>}
    {!!error && <Notice error>{error}</Notice>}
    {!!message && <Notice>{message}</Notice>}
    <Modal visible={!!activePost} animationType="slide" onRequestClose={() => setSelected(null)}>
      <Page>
        <Button label="Cerrar publicación" variant="ghost" onPress={() => setSelected(null)} />
        {activePost && <Card>
          {postDetails(activePost)}
          {activePost.userId === user?.id ? <>
            <Button label="Eliminar publicación" compact variant="ghost" onPress={() => setConfirmDelete(true)} />
            {confirmDelete && <>
              <Notice>Se eliminarán la foto y sus me gusta del servidor.</Notice>
              <Button label="Confirmar eliminación" disabled={busy} onPress={() => void run(async () => {
                await request(`/posts/${activePost.id}`, "DELETE"); setSelected(null); setRevision(r => r + 1);
              })} />
              <Button label="Conservar foto" compact variant="ghost" onPress={() => setConfirmDelete(false)} />
            </>}
          </> : <>
            <Button label="Denunciar y ocultar" variant="ghost" compact onPress={() => setReporting(true)} />
            {reporting && <>
              <Field label="Motivo de la denuncia" value={reason} onChangeText={setReason} maxLength={300} />
              <Button label="Enviar denuncia" disabled={busy || !reason.trim()} onPress={() => void run(async () => {
                await request("/reports", "POST", { postId: activePost.id, reason }); setSelected(null); setReason(""); setRevision(r => r + 1); setMessage("Denuncia registrada. Hemos ocultado la publicación para ti.");
              })} />
            </>}
          </>}
          {!!error && <Notice error>{error}</Notice>}
        </Card>}
      </Page>
    </Modal>
  </Page>;
}
