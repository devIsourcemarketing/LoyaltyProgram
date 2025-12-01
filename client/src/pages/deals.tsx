import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Deal } from "@shared/schema";
import { useTranslation } from "@/hooks/useTranslation";
import { t } from '@/lib/i18n';




export default function Deals() {
  const { t } = useTranslation();
  return (
    <div 
      className="min-h-screen bg-white relative"
      style={{
        backgroundColor: '#ffffff'
      }}
    >
      {/* Hero Banner */}
      <div 
        className="relative z-10 bg-transparent"
        style={{
          minHeight: '600px',
          paddingTop: '60px'
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <div className="text-left space-y-6">
            <h1 className="text-6xl lg:text-7xl font-bold leading-tight text-green-600" data-testid="text-page-title">
              {t("common.termsAndConditions")}
            </h1>
            <h2 className="text-3xl font-bold text-dark">{t("deals.TyCtitle1")}</h2>
            <p className="font-normal text-gray-800 whitespace-pre-line">{t("deals.TyCtext1")}</p>

            <h2 className="text-3xl font-bold text-dark">{t("deals.TyCtitle2")}</h2>
            <p className="font-normal text-gray-800 whitespace-pre-line">{t("deals.TyCtext2")}</p>

            <h2 className="text-3xl font-bold text-dark">{t("deals.TyCtitle3")}</h2>
            <p className="font-normal text-gray-800 whitespace-pre-line">{t("deals.TyCtext3")}</p>

            <h2 className="text-3xl font-bold text-dark">{t("deals.TyCtitle4")}</h2>
            <p className="font-normal text-gray-800 whitespace-pre-line">{t("deals.TyCtext4")}</p>

            <h2 className="text-3xl font-bold text-dark">{t("deals.TyCtitle5")}</h2>
            <p className="font-normal text-gray-800 whitespace-pre-line">{t("deals.TyCtext5")}</p>

            <h2 className="text-3xl font-bold text-dark">{t("deals.TyCtitle6")}</h2>
            <p className="font-normal text-gray-800 whitespace-pre-line">{t("deals.TyCtext6")}</p>

            <h2 className="text-3xl font-bold text-dark">{t("deals.TyCtitle7")}</h2>
            <p className="font-normal text-gray-800 whitespace-pre-line">{t("deals.TyCtext7")}</p>

            <h2 className="text-3xl font-bold text-dark">{t("deals.TyCtitle8")}</h2>
            <p className="font-normal text-gray-800 whitespace-pre-line">{t("deals.TyCtext8")}</p>

            <h2 className="text-3xl font-bold text-dark">{t("deals.TyCtitle9")}</h2>
            <p className="font-normal text-gray-800 whitespace-pre-line">{t("deals.TyCtext9")}</p>

            <h2 className="text-3xl font-bold text-dark">{t("deals.TyCtitle10")}</h2>
            <p className="font-normal text-gray-800 whitespace-pre-line">{t("deals.TyCtext10")}</p>

            <h2 className="text-3xl font-bold text-dark">{t("deals.TyCtitle11")}</h2>
            <p className="font-normal text-gray-800 whitespace-pre-line">{t("deals.TyCtext11")}</p>

            <h2 className="text-3xl font-bold text-dark">{t("deals.TyCtitle12")}</h2>
            <p className="font-normal text-gray-800 whitespace-pre-line">{t("deals.TyCtext12")}</p>

            <h2 className="text-3xl font-bold text-dark">{t("deals.TyCtitle13")}</h2>
            <p className="font-normal text-gray-800 whitespace-pre-line">{t("deals.TyCtext13")}</p>

            <h2 className="text-3xl font-bold text-dark">{t("deals.TyCtitle14")}</h2>
            <p className="font-normal text-gray-800 whitespace-pre-line">{t("deals.TyCtext14")}</p>
          </div>
        </div>
      </div>      
    </div>
  );
}
