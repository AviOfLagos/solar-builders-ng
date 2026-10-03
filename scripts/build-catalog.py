"""Builds src/data/catalog.json from research JSON (official-source prices)."""
import json, re, sys, os, hashlib
R = sys.argv[1]
brand_meta = {
  "Felicity Solar Nigeria": ("felicity", "Felicity Solar", "Inverters, lithium batteries and panels engineered for Nigerian grid conditions."),
  "itel Energy / itel Solar Nigeria": ("itel", "itel Energy", "Smart hybrid inverters, lithium storage and complete home kits."),
  "Sun King Nigeria": ("sun-king", "Sun King", "Solar home systems, lanterns and PowerHub inverters for every budget."),
  "Arnergy": ("arnergy", "Arnergy", "Nigerian-built scalable LFP storage for homes and businesses."),
  "EcoFlow": ("ecoflow", "EcoFlow", "Portable power stations and solar generators — plug in, power up."),
}
def cat(c, name):
  c = c.lower(); n = name.lower()
  if "charge controller" in c or "light" in c or "appliance" in c: return "lights-accessories"
  if "panel" in c: return "solar-panels"
  if "battery" in c and "home battery" not in c: return "batteries"
  if "inverter" in c: return "inverters"
  if "power" in c and "station" in c: return "power-stations"
  if "home battery" in c: return "power-stations"
  return "complete-systems"
def slugify(s): return re.sub(r"-+","-",re.sub(r"[^a-z0-9]+","-",s.lower())).strip("-")[:70]
products=[]; brands=[]; seen=set()
for f in ["felicity_itel.json","sunking_bluecamel.json","others.json","fifth.json"]:
  d=json.load(open(os.path.join(R,f)))
  for b in d["brands"]:
    if not b["hasOfficialPrices"] or b["name"] not in brand_meta: continue
    bslug,bname,tag=brand_meta[b["name"]]
    brands.append({"slug":bslug,"name":bname,"tagline":tag,"officialUrl":b["officialUrl"]})
    for p in b["products"]:
      s=slugify(p["name"] if p["name"].lower().startswith(bname.split()[0].lower()) else bname+" "+p["name"])
      while s in seen: s+="-2"
      seen.add(s)
      ext=os.path.splitext(p["imageUrl"].split("?")[0])[1].lower() or ".jpg"
      if ext not in (".png",".jpg",".jpeg",".webp"): ext=".jpg"
      products.append({"id":hashlib.md5(s.encode()).hexdigest()[:8],"slug":s,"name":p["name"] if p["name"].lower().startswith(bname.split()[0].lower()) else f"{bname} {p['name']}",
        "brand":bslug,"category":cat(p["category"],p["name"]),"costNgn":int(p["priceNgn"]),
        "specs":p.get("specs",[])[:4],"description":p.get("description",""),
        "image":f"/products/{s}{ext}","imageSource":p["imageUrl"],"sourceUrl":p["sourceUrl"]})
json.dump({"brands":brands,"products":products},open(sys.argv[2],"w"),indent=1,ensure_ascii=False)
print(len(brands),"brands",len(products),"products")
from collections import Counter; print(Counter(p["category"] for p in products))
