import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; chargeId: string }> }
) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: cardId, chargeId } = await params;

  const { data: card, error: cardError } = await supabase
    .from("credit_cards")
    .select("id")
    .eq("id", cardId)
    .eq("user_id", user.id)
    .single();

  if (cardError || !card) {
    return NextResponse.json(
      { error: "Credit card not found" },
      { status: 404 }
    );
  }

  const { data: transaction, error: txError } = await supabase
    .from("transactions")
    .select("*")
    .eq("id", chargeId)
    .eq("user_id", user.id)
    .single();

  if (txError || !transaction) {
    return NextResponse.json(
      { error: "Transaction not found" },
      { status: 404 }
    );
  }

  const body = await request.json();

  if (
    !body.description ||
    typeof body.description !== "string" ||
    body.description.trim() === ""
  ) {
    return NextResponse.json(
      { error: "Description is required" },
      { status: 400 }
    );
  }

  if (
    typeof body.total_amount_cents !== "number" ||
    body.total_amount_cents <= 0
  ) {
    return NextResponse.json(
      { error: "Amount must be a positive number" },
      { status: 400 }
    );
  }

  if (!body.date || typeof body.date !== "string") {
    return NextResponse.json(
      { error: "Purchase date is required" },
      { status: 400 }
    );
  }

  const isInstallment = !!body.is_installment;
  const totalInstallments = isInstallment
    ? typeof body.total_installments === "number" && body.total_installments > 0
      ? body.total_installments
      : 1
    : 1;

  if (isInstallment && (!body.total_installments || body.total_installments < 2)) {
    return NextResponse.json(
      { error: "Total installments must be at least 2 for installment purchases" },
      { status: 400 }
    );
  }

  // If the transaction was an installment, find all related installments
  // using its original description and total_installments.
  let relatedIds: string[] = [];
  if (transaction.is_installment) {
    const query = supabase
      .from("transactions")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_installment", true)
      .eq("description", transaction.description)
      .eq("total_installments", transaction.total_installments)
      .order("date", { ascending: true });

    if (transaction.credit_card_id) {
      query.eq("credit_card_id", transaction.credit_card_id);
    } else if (transaction.payment_source_id) {
      query.eq("payment_source_id", transaction.payment_source_id);
    }

    const { data: related } = await query;
    relatedIds = (related ?? []).map((t) => t.id);
  }

  // If the transaction was an installment, delete all related installments
  // and recreate based on the new data.
  if (transaction.is_installment) {
    if (relatedIds.length > 0) {
      const { error: deleteError } = await supabase
        .from("transactions")
        .delete()
        .in("id", relatedIds)
        .eq("user_id", user.id);

      if (deleteError) {
        return NextResponse.json(
          { error: deleteError.message },
          { status: 500 }
        );
      }
    }

    if (isInstallment) {
      const installmentAmount = Math.round(
        body.total_amount_cents / totalInstallments
      );
      const remainder =
        body.total_amount_cents - installmentAmount * totalInstallments;
      const purchaseDate = new Date(body.date);

      const rows: Record<string, unknown>[] = [];
      for (let i = 0; i < totalInstallments; i++) {
        const date = new Date(purchaseDate);
        date.setMonth(date.getMonth() + i);

        let amount = installmentAmount;
        if (i === 0) {
          amount += remainder;
        }

        rows.push({
          user_id: user.id,
          description: body.description.trim(),
          amount_cents: amount,
          date: date.toISOString().split("T")[0],
          budget_category_id: body.budget_category_id ?? null,
          credit_card_id: cardId,
          payment_source_id: null,
          fixed_expense_id: null,
          is_installment: true,
          total_installments: totalInstallments,
          current_installment: i + 1,
        });
      }

      const { data, error: insertError } = await supabase
        .from("transactions")
        .insert(rows)
        .select();

      if (insertError) {
        return NextResponse.json(
          { error: insertError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ data });
    }

    // Changed from installment to single
    const isPaymentSource = !!body.payment_source_id;
    const { data, error: insertError } = await supabase
      .from("transactions")
      .insert({
        user_id: user.id,
        description: body.description.trim(),
        amount_cents: body.total_amount_cents,
        date: body.date,
        budget_category_id: body.budget_category_id ?? null,
        credit_card_id: isPaymentSource ? null : cardId,
        payment_source_id: isPaymentSource ? body.payment_source_id : null,
        fixed_expense_id: null,
        is_installment: false,
        total_installments: null,
        current_installment: null,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  }

  // Was not an installment
  if (isInstallment) {
    // Changed from single to installment
    const { error: deleteError } = await supabase
      .from("transactions")
      .delete()
      .eq("id", transaction.id)
      .eq("user_id", user.id);

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 }
      );
    }

    const installmentAmount = Math.round(
      body.total_amount_cents / totalInstallments
    );
    const remainder =
      body.total_amount_cents - installmentAmount * totalInstallments;
    const purchaseDate = new Date(body.date);

    const rows: Record<string, unknown>[] = [];
    for (let i = 0; i < totalInstallments; i++) {
      const date = new Date(purchaseDate);
      date.setMonth(date.getMonth() + i);

      let amount = installmentAmount;
      if (i === 0) {
        amount += remainder;
      }

      rows.push({
        user_id: user.id,
        description: body.description.trim(),
        amount_cents: amount,
        date: date.toISOString().split("T")[0],
        budget_category_id: body.budget_category_id ?? null,
        credit_card_id: cardId,
        payment_source_id: null,
        fixed_expense_id: null,
        is_installment: true,
        total_installments: totalInstallments,
        current_installment: i + 1,
      });
    }

    const { data, error: insertError } = await supabase
      .from("transactions")
      .insert(rows)
      .select();

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  }

  // Simple update
  const isPaymentSource = !!body.payment_source_id;
  const updates: Record<string, unknown> = {
    description: body.description.trim(),
    amount_cents: body.total_amount_cents,
    date: body.date,
    budget_category_id: body.budget_category_id ?? null,
    credit_card_id: isPaymentSource ? null : cardId,
    payment_source_id: isPaymentSource ? body.payment_source_id : null,
  };

  const { data, error: updateError } = await supabase
    .from("transactions")
    .update(updates)
    .eq("id", transaction.id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ data });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; chargeId: string }> }
) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: cardId, chargeId } = await params;

  const { data: card, error: cardError } = await supabase
    .from("credit_cards")
    .select("id")
    .eq("id", cardId)
    .eq("user_id", user.id)
    .single();

  if (cardError || !card) {
    return NextResponse.json(
      { error: "Credit card not found" },
      { status: 404 }
    );
  }

  const { data: transaction, error: txError } = await supabase
    .from("transactions")
    .select("id")
    .eq("id", chargeId)
    .eq("user_id", user.id)
    .single();

  if (txError || !transaction) {
    return NextResponse.json(
      { error: "Transaction not found" },
      { status: 404 }
    );
  }

  const { error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", chargeId)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
