import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, Globe, Trophy, Settings, Tag, Award, FolderTree } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import CategoriesMasterManager from "./masters/CategoriesMasterManager";
import RegionCategoriesManager from "./masters/RegionCategoriesManager";
import PrizeTemplatesManager from "./masters/PrizeTemplatesManager";
import ProductTypesManager from "./masters/ProductTypesManager";

export default function MastersTab() {
  const { t } = useTranslation();
  const [activeSubTab, setActiveSubTab] = useState("categories-master");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            {t('admin.masterData')}
          </CardTitle>
          <p className="text-sm text-gray-600">
            {t('admin.masterDataDescription')}
          </p>
        </CardHeader>
        <CardContent>
          <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="categories-master" className="flex items-center gap-2">
                <FolderTree className="h-4 w-4" />
                Categorías Globales
              </TabsTrigger>
              <TabsTrigger value="region-categories" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Por Región
              </TabsTrigger>
              <TabsTrigger value="prize-templates" className="flex items-center gap-2">
                <Trophy className="h-4 w-4" />
                {t('admin.prizeTemplates')}
              </TabsTrigger>
              <TabsTrigger value="product-types" className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                {t('admin.productTypes')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="categories-master" className="mt-6">
              <CategoriesMasterManager />
            </TabsContent>

            <TabsContent value="region-categories" className="mt-6">
              <RegionCategoriesManager />
            </TabsContent>

            <TabsContent value="prize-templates" className="mt-6">
              <PrizeTemplatesManager />
            </TabsContent>

            <TabsContent value="product-types" className="mt-6">
              <ProductTypesManager />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
