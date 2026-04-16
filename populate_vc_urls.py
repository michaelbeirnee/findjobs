#!/usr/bin/env python3
"""One-time script to populate website URLs for VC firms."""
import json
 
WEBSITE_MAP = {
    "Sequoia Capital Operations": "https://www.sequoiacap.com",
    "Andreessen Horowitz": "https://a16z.com",
    "General Catalyst": "https://www.generalcatalyst.com",
    "Encap Investments": "https://www.encapinvestments.com",
    "Lightspeed Venture Partners": "https://lsvp.com",
    "New Enterprise Associates": "https://www.nea.com",
    "Accel Management": "https://www.accel.com",
    "Cobalt Investment Management": "https://www.cobaltlp.com",
    "Founders Fund": "https://foundersfund.com",
    "Index Ventures SA": "https://www.indexventures.com",
    "Bessemer Venture Partners": "https://www.bvp.com",
    "Thrive Capital": "https://www.thrivecap.com",
    "Impresa Management": "https://www.impresamgmt.com",
    "Khosla Ventures": "https://www.khoslaventures.com",
    "Angellist Advisors": "https://www.angellist.com",
    "Flagship Pioneering": "https://www.flagshippioneering.com",
    "Banyan Capital Partners": "https://www.banyancapitalpartners.com",
    "Spark Capital": "https://www.sparkcapital.com",
    "Ribbit Capital": "https://ribbitcap.com",
    "Y Combinator": "https://www.ycombinator.com",
    "RA Capital Management": "https://www.racap.com",
    "Sapphire Ventures": "https://sapphireventures.com",
    "Kleiner Perkins": "https://www.kleinerperkins.com",
    "Altimeter Capital Management": "https://www.altimetercap.com",
    "Arch Venture Partners": "https://www.archventure.com",
    "IDG Capital Fund Management": "https://www.idgcapital.com",
    "Bain Capital Ventures": "https://www.baincapitalventures.com",
    "Greenoaks Capital": "https://greenoakscap.com",
    "Matrix Partners China Management": "https://www.matrixpartners.com.cn",
    "Greylock Partners": "https://greylock.com",
    "GGV Capital": "https://www.ggvc.com",
    "Oak Hcft Management": "https://www.oakhcft.com",
    "FTV Capital": "https://www.ftvcapital.com",
    "Eight Partners VC": "https://www.8vc.com",
    "Accel Partners Management": "https://www.accel.com",
    "Accel London Management Limited": "https://www.accel.com",
    "Balderton Capital": "https://www.balderton.com",
    "LUX Capital Management": "https://www.luxcapital.com",
    "Altos Ventures Management": "https://www.altosventures.com",
    "Bond": "https://www.bondcap.com",
    "Addition": "https://www.addition.com",
    "Redpoint Ventures": "https://www.redpoint.com",
    "B Capital Group": "https://www.bcapgroup.com",
    "CRV": "https://www.crv.com",
    "Columbia Capital": "https://www.colcap.com",
    "Kaszek Management S.A.": "https://www.kaszek.com",
    "Craft Ventures Management": "https://www.craftventures.com",
    "Canaan Partners": "https://www.canaan.com",
    "Matrix Partners": "https://www.matrixpartners.com",
    "Indigo Partners": "https://www.indigopartners.com",
    "Eclipse Ventures": "https://www.eclipse.vc",
    "Hedosophia Advisor Limited": "https://www.hedosophia.com",
    "DFJ Growth": "https://www.dfjgrowth.com",
    "VR Management": "https://www.vrmanagement.com",
    "Qiming Venture Partners": "https://www.qimingvc.com",
    "Zeev Ventures": "https://www.zeevventures.com",
    "Felicis Ventures": "https://www.felicis.com",
    "Menlo Ventures": "https://www.menlovc.com",
    "Benchmark Capital": "https://www.benchmark.com",
    "Greycroft": "https://www.greycroft.com",
    "Momentum Capital Partners Alpha Advisor Limited": "https://www.momentumcp.com",
    "Polaris Growth Management": "https://www.polarisgrowth.com",
    "K5 Global Advisor": "https://www.k5global.com",
    "Firstmark Capital": "https://firstmarkcap.com",
    "Atreides Management": "https://atreidesmanagement.com",
    "Madrona Venture Group": "https://www.madrona.com",
    "Fifth Wall Asset Management": "https://fifthwall.com",
    "Valar Ventures": "https://www.valarventures.com",
    "Momentum Capital Partners Fund IV Advisor Limited": "https://www.momentumcp.com",
    "Elevation Capital Partners": "https://www.elevationcapital.com",
    "Column Group": "https://www.thecolumngroup.com",
    "QED Investors": "https://www.qedinvestors.com",
    "Eight Roads GP": "https://eightroads.com",
    "Nexus Ventures Advisors Private Limited": "https://www.nexusvp.com",
    "Foundation Capital": "https://www.foundationcap.com",
    "5Y Capital Management Limited": "https://www.5ycap.com",
    "Meritech Capital": "https://www.meritechcapital.com",
    "Versant Venture Management": "https://www.versantventures.com",
    "Golden Sand River Digital": "https://www.gsrventures.com",
    "Qiming Global Management": "https://www.qimingvc.com",
    "Goodwater Capital": "https://www.goodwatercap.com",
    "Mayfield Fund L.L.C. A Delaware Limited Liability": "https://www.mayfield.com",
    "BRV Lotus Holdings Limited": "https://www.brv.com",
    "Breakthrough Energy Ventures": "https://www.breakthroughenergy.org",
    "Next Legacy Management": "https://www.nextlegacy.com",
    "Union Square Ventures": "https://www.usv.com",
    "IDG Vc Management": "https://www.idgcapital.com",
    "HV Capital Manager GMBH": "https://www.hvcapital.com",
    "Highland Europe Geneva S.A.R.L.": "https://www.highlandeurope.com",
    "Foresite Capital": "https://www.foresitecapital.com",
    "True Ventures": "https://trueventures.com",
    "Foundry Group": "https://www.foundrygroup.com",
    "Signalfire": "https://www.signalfire.com",
    "MPM Bioimpact": "https://www.mpmbioimpact.com",
    "83north 2017": "https://www.83north.com",
    "Emergence Equity Management": "https://www.emcap.com",
    "DCM": "https://www.dcm.com",
    "Forerunner Ventures Management": "https://www.forerunnerventures.com",
    "Georgian Partners Growth": "https://www.georgian.io",
    "h Investment Management": "https://www.hinvestment.com",
}
 
def main():
    with open("vc_firms_data.json", "r") as f:
        firms = json.load(f)
 
    updated = 0
    missing = []
 
    for firm in firms:
        name = firm["name"]
        if name in WEBSITE_MAP:
            firm["website"] = WEBSITE_MAP[name]
            firm["careerUrl"] = None
            updated += 1
        else:
            firm["website"] = None
            firm["careerUrl"] = None
            missing.append(name)
 
    with open("vc_firms_data.json", "w") as f:
        json.dump(firms, f, indent=2)
 
    print(f"Updated {updated}/{len(firms)} firms with website URLs")
    if missing:
        print(f"\nMissing URLs for {len(missing)} firms:")
        for name in missing:
            print(f"  - {name}")
 
if __name__ == "__main__":
    main()