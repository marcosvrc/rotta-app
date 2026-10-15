import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card, ErrorBox, FormScreen, PrimaryButton, ScreenHeader, Segmented, TextField, Txt, confirmAction } from '@/components/ui';
import { AuthMode, validateCredentials } from '@/core/account';
import { PRIVACY_URL } from '@/core/legal';
import { SyncStatus, useAccount } from '@/state/account';
import { useRotta } from '@/state/rotta';
import { colors } from '@/theme';


const STATUS_TEXT: Record<SyncStatus, string> = {
  desligado: 'Nuvem desligada',
  parado: 'Aguardando',
  sincronizando: 'Sincronizando…',
  ok: 'Tudo sincronizado',
  erro: 'Não foi possível sincronizar agora',
};

function hhmm(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function AccountScreen() {
  const account = useAccount();
  if (!account.configured) return <NotConfigured />;
  if (!account.authReady) {
    return (
      <SafeAreaView style={styles.screen}>
        <ScreenHeader back title="Conta" />
        <ActivityIndicator style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }
  return account.email ? <SignedIn /> : <SignInForm />;
}

function NotConfigured() {
  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <ScreenHeader back title="Conta e nuvem" />
      <View style={styles.content}>
        <Card>
          <Txt weight="semibold" size={15}>
            A nuvem ainda não está ligada nesta versão
          </Txt>
          <Txt size={13} color={colors.muted} style={{ marginTop: 4 }}>
            Tudo continua salvo neste aparelho. Quando o projeto do Firebase for configurado, você poderá entrar com e-mail e
            senha e ver suas viagens em outro celular.
          </Txt>
        </Card>
      </View>
    </SafeAreaView>
  );
}

function SignInForm() {
  const { signIn, signUp, resetPassword } = useAccount();
  const [mode, setMode] = useState<AuthMode>('entrar');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const problems = validateCredentials(email, password, mode);
    setErrors(problems);
    setInfo(null);
    if (problems.length > 0) return;
    setBusy(true);
    const error = mode === 'entrar' ? await signIn(email, password) : await signUp(email, password);
    setBusy(false);
    if (error) setErrors([error]);
  };

  const forgot = async () => {
    const problems = validateCredentials(email, 'x', 'entrar');
    if (problems.length > 0) {
      setErrors(['Digite seu e-mail para receber o link de nova senha.']);
      return;
    }
    const error = await resetPassword(email);
    setErrors(error ? [error] : []);
    setInfo(error ? null : 'Enviamos um link para criar uma nova senha. Confira seu e-mail.');
  };

  return (
    <FormScreen
      title="Conta e nuvem"
      subtitle="Suas viagens em qualquer celular"
      saveLabel={busy ? 'Aguarde…' : mode === 'entrar' ? 'Entrar' : 'Criar conta'}
      onSave={busy ? () => undefined : submit}
    >
      <Segmented<AuthMode>
        value={mode}
        onChange={(m) => {
          setMode(m);
          setErrors([]);
        }}
        options={[
          { value: 'entrar', label: 'Entrar' },
          { value: 'criar', label: 'Criar conta' },
        ]}
      />
      <ErrorBox errors={errors} />
      {info ? (
        <View style={styles.info}>
          <Txt size={13} color={colors.goodInk}>
            {info}
          </Txt>
        </View>
      ) : null}
      <TextField label="E-mail" value={email} onChangeText={setEmail} placeholder="voce@email.com" keyboardType="email-address" />
      <TextField
        label="Senha"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        hint={mode === 'criar' ? 'Pelo menos 8 caracteres.' : undefined}
      />
      {mode === 'entrar' && (
        <Pressable onPress={forgot} accessibilityRole="button" style={{ paddingVertical: 8 }}>
          <Txt weight="semibold" color={colors.body}>
            Esqueci a senha
          </Txt>
        </Pressable>
      )}
      <Txt size={12} color={colors.muted}>
        Ao entrar, as viagens deste aparelho sobem para a sua conta e as da conta aparecem aqui. Anexos de reservas ficam só no
        aparelho onde foram adicionados.
      </Txt>
      <Pressable onPress={() => Linking.openURL(PRIVACY_URL)} accessibilityRole="link" style={{ paddingVertical: 6 }}>
        <Txt size={13} weight="semibold" color={colors.body}>
          Política de privacidade
        </Txt>
      </Pressable>
    </FormScreen>
  );
}

function SignedIn() {
  const { email, status, lastSyncAt, syncNow, signOut, deleteAccount } = useAccount();
  const [deleting, setDeleting] = useState(false);
  const [password, setPassword] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const confirmDelete = () =>
    confirmAction(
      'Excluir conta?',
      'Sua conta, as viagens na nuvem e os dados deste aparelho serão apagados. Isso não pode ser desfeito.',
      'Excluir',
      async () => {
        setBusy(true);
        const error = await deleteAccount(password);
        setBusy(false);
        setDeleteError(error);
      },
    );
  const { data } = useRotta();
  const ok = status === 'ok';
  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <ScreenHeader back title="Conta e nuvem" />
      <View style={styles.content}>
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={[styles.icon, { backgroundColor: ok ? colors.goodBg : colors.background }]}>
              <Ionicons
                name={status === 'erro' ? 'cloud-offline-outline' : ok ? 'cloud-done-outline' : 'cloud-upload-outline'}
                size={22}
                color={ok ? colors.goodInk : colors.body}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Txt weight="semibold" size={15} numberOfLines={1}>
                {email ?? ''}
              </Txt>
              <Txt size={13} color={colors.muted} accessibilityLiveRegion="polite">
                {lastSyncAt && status !== 'sincronizando' ? `${STATUS_TEXT[status]} · ${hhmm(lastSyncAt)}` : STATUS_TEXT[status]}
              </Txt>
            </View>
          </View>
          <Txt size={13} color={colors.body} style={{ marginTop: 12 }}>
            {`${data.trips.length} ${data.trips.length === 1 ? 'viagem' : 'viagens'} na conta. As mudanças sobem sozinhas alguns segundos depois de cada edição.`}
          </Txt>
          {status === 'erro' && (
            <Txt size={13} color={colors.criticalInk} style={{ marginTop: 6 }}>
              Sem conexão ou sem permissão. Seus dados continuam salvos no aparelho e sobem quando a conexão voltar.
            </Txt>
          )}
          <PrimaryButton label="Sincronizar agora" filled={false} onPress={syncNow} style={{ marginTop: 14 }} />
        </Card>
        <PrimaryButton
          label="Sair da conta"
          filled={false}
          style={{ marginTop: 14 }}
          onPress={() =>
            confirmAction('Sair da conta?', 'As viagens continuam salvas neste aparelho.', 'Sair', () => {
              signOut();
            })
          }
        />
        {deleting ? (
          <Card style={{ marginTop: 20 }}>
            <Txt weight="semibold" size={15} color={colors.criticalInk}>
              Excluir conta e dados
            </Txt>
            <Txt size={13} color={colors.body} style={{ marginTop: 4, marginBottom: 12 }}>
              Apaga sua conta, todas as viagens guardadas na nuvem, o histórico de uso da IA e os dados deste aparelho. Faça um
              backup antes, se quiser guardar as viagens.
            </Txt>
            <TextField label="Confirme sua senha" value={password} onChangeText={setPassword} secureTextEntry />
            <ErrorBox errors={deleteError ? [deleteError] : []} />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <PrimaryButton label="Cancelar" filled={false} onPress={() => setDeleting(false)} />
              <PrimaryButton
                label={busy ? 'Excluindo…' : 'Excluir tudo'}
                onPress={() => (busy || !password ? setDeleteError(password ? null : 'Digite sua senha.') : confirmDelete())}
                style={{ flex: 1, backgroundColor: '#B42318', borderColor: '#B42318' }}
              />
            </View>
          </Card>
        ) : (
          <Pressable onPress={() => setDeleting(true)} accessibilityRole="button" style={{ paddingVertical: 14, alignSelf: 'center' }}>
            <Txt weight="semibold" color={colors.criticalInk}>
              Excluir conta e dados
            </Txt>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 16, paddingTop: 12 },
  icon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  info: { backgroundColor: colors.goodBg, borderRadius: 14, padding: 12 },
});
