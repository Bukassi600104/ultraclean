export type LivestockClassification = { chicken_type: string; growth_stage: string; sex: string };
export const emptyClassification = (): LivestockClassification => ({ chicken_type: "", growth_stage: "", sex: "unknown" });
const stages: Record<string, string[]> = {catfish:["fingerlings","juvenile"],goat:["weaner","adolescent","adult"],pig:["weaner","grower","adult"],turkey:["poult","grower","juvenile","finisher"],cattle:["calf","weaner","stocker_feeder","fattening","finished_adult"]};
export function livestockStages(product: string, chickenType = "") { return product === "chicken" ? chickenType === "broiler" ? ["chick","two_weeks_old"] : chickenType === "layer" ? ["chick","point_of_lay","layers"] : [] : stages[product] || []; }
export function validClassification(product: string, value: LivestockClassification) {
  return livestockStages(product,value.chicken_type).includes(value.growth_stage) && ["male","female","unknown"].includes(value.sex) && (product === "chicken" ? ["broiler","layer"].includes(value.chicken_type) : value.chicken_type === "") && (product !== "catfish" || value.sex === "unknown");
}
export function livestockLabel(key: string) { return ({stocker_feeder:"Stocker/Feeder",two_weeks_old:"2 weeks old",point_of_lay:"Point of lay",finished_adult:"Finished Adult"} as Record<string,string>)[key] || key.charAt(0).toUpperCase()+key.slice(1).replaceAll("_"," "); }
export function livestockSexLabel(product: string, sex: string) { return sex === "unknown" ? "Unknown" : ({goat:{male:"Billy goat",female:"Nanny goat"},turkey:{male:"Tom",female:"Hen"},cattle:{male:"Bull",female:"Cow"}} as Record<string,Record<string,string>>)[product]?.[sex] || livestockLabel(sex); }
export type LivestockGroup = LivestockClassification & { id: string | null; product: string; quantity: number };
export function livestockGroupLabel(group: LivestockGroup) { return group.id ? [group.chicken_type && livestockLabel(group.chicken_type),livestockLabel(group.growth_stage),livestockSexLabel(group.product,group.sex)].filter(Boolean).join(" · ") : "Unclassified / legacy stock"; }
