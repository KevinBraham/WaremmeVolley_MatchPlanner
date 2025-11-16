import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/service';

function getRedirectBase(headers: Headers) {
  return headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
}

export async function POST(req: Request) {
  try {
    const { email, firstName, lastName, role } = await req.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email invalide' }, { status: 400 });
    }

    const redirectBase = getRedirectBase(req.headers);

    const { data: inviteData, error: inviteError } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        redirectTo: redirectBase ? `${redirectBase.replace(/\/$/, '')}/set-password` : undefined,
      });

    if (inviteError) {
      return NextResponse.json({ error: inviteError.message }, { status: 400 });
    }

    const userId = inviteData?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Impossible de récupérer l’utilisateur nouvellement créé.' }, { status: 500 });
    }

    const { error: profileError } = await supabaseAdmin
      .from('users_profiles')
      .upsert({
        user_id: userId,
        first_name: firstName || null,
        last_name: lastName || null,
        display_name: null,
        role: role === 'admin' ? 'admin' : 'agent',
      });

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    return NextResponse.json({ userId }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erreur interne' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { userId, firstName, lastName, role } = await req.json();

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'Identifiant utilisateur manquant' }, { status: 400 });
    }

    const updates: Record<string, any> = {
      first_name: firstName ?? null,
      last_name: lastName ?? null,
      role: role === 'admin' ? 'admin' : 'agent',
    };

    const { error: profileError } = await supabaseAdmin
      .from('users_profiles')
      .update(updates)
      .eq('user_id', userId);

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    return NextResponse.json({ userId }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erreur interne' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { userId } = await req.json();

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'Identifiant utilisateur manquant' }, { status: 400 });
    }

    const { error: profileError } = await supabaseAdmin
      .from('users_profiles')
      .delete()
      .eq('user_id', userId);

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    return NextResponse.json({ userId }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erreur interne' }, { status: 500 });
  }
}


