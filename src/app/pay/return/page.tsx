import { Suspense } from "react";

import { Rings } from "@/components/brand/rings";
import { buttonStyles } from "@/components/ui/button";
import { appReturnUrl, returnOrderId } from "@/lib/app-links";

import { OpenApp } from "./open-app";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * `/pay/return?order_id=N` — where Click and Payme send a customer who paid in
 * the Glow Derma mobile app (backend `PAYMENT_RETURN_URL`). With the app
 * installed and the `.well-known` files configured, iOS and Android open the
 * app directly and this page is never shown; otherwise it hands over to the
 * app through its custom scheme. The app re-reads the order from the API, so
 * nothing here is trusted beyond the digits of the order id.
 */
export default function PaymentReturnPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[440px] flex-col items-center justify-center gap-6 px-6 py-12 text-center">
      <div className="relative flex size-36 items-center justify-center">
        <Rings
          viewBox={144}
          rings={[
            [40, 1],
            [56, 0.6],
            [70, 0.3],
          ]}
          className="absolute inset-0 size-full text-gold"
        />
        <span
          className="text-3xl flex size-16 items-center justify-center rounded-full bg-gold text-on-gold"
          aria-hidden="true"
        >
          ✓
        </span>
      </div>
      <Suspense
        fallback={<p className="text-body text-ink-muted">Glow Derma ilovasiga qaytmoqda…</p>}
      >
        <ReturnBody searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function ReturnBody({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const orderId = returnOrderId(params.order_id);
  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="font-serif text-display">Glow Derma ilovasiga qaytmoqda…</h1>
        <p className="text-body text-ink-muted">
          To‘lov holatini ilovadagi buyurtma sahifasida ko‘rasiz. Ilova ochilmasa, quyidagi tugmani
          bosing.
        </p>
        <p className="text-body-sm text-ink-muted" lang="ru">
          Статус оплаты отображается в приложении. Если приложение не открылось, нажмите кнопку
          ниже.
        </p>
      </div>
      <div className="flex w-full flex-col gap-3">
        <OpenApp href={appReturnUrl(orderId)} label="Ilovani ochish" />
        {orderId ? (
          <a
            href={`/buyurtmalar/${orderId}`}
            className={buttonStyles({ variant: "outline", size: "lg", className: "w-full" })}
          >
            Buyurtmani saytda ko‘rish
          </a>
        ) : null}
      </div>
    </>
  );
}
