#!/usr/bin/env python3
"""One-time script to convert swe_firms_data.json from a list of company
names to the object format expected by scraper.py, and to seed website URLs
for well-known companies.
 
Input format (before):  ["OpenAI", "Netflix", ...]
Output format (after):  [{"name": "OpenAI", "website": "https://openai.com", "careerUrl": null}, ...]
"""
import json
 
WEBSITE_MAP = {
    "OpenAI": "https://openai.com",
    "Anthropic": "https://www.anthropic.com",
    "Netflix": "https://www.netflix.com",
    "Airbnb": "https://www.airbnb.com",
    "Snowflake": "https://www.snowflake.com",
    "Coinbase": "https://www.coinbase.com",
    "Instacart": "https://www.instacart.com",
    "Roblox": "https://www.roblox.com",
    "Waymo": "https://waymo.com",
    "Discord": "https://discord.com",
    "Brex": "https://www.brex.com",
    "AppLovin": "https://www.applovin.com",
    "Jane Street": "https://www.janestreet.com",
    "Grammarly": "https://www.grammarly.com",
    "Facebook": "https://www.metacareers.com",
    "Amplitude": "https://amplitude.com",
    "Two Sigma": "https://www.twosigma.com",
    "Airtable": "https://airtable.com",
    "Credit Karma": "https://www.creditkarma.com",
    "DoorDash": "https://www.doordash.com",
    "Thumbtack": "https://www.thumbtack.com",
    "Chime": "https://www.chime.com",
    "Plaid": "https://plaid.com",
    "Samsara": "https://www.samsara.com",
    "Notion": "https://www.notion.so",
    "Broadcom": "https://www.broadcom.com",
    "Dropbox": "https://www.dropbox.com",
    "Apple": "https://www.apple.com",
    "Confluent": "https://www.confluent.io",
    "Lyft": "https://www.lyft.com",
    "ByteDance": "https://www.bytedance.com",
    "Opendoor": "https://www.opendoor.com",
    "Google": "https://www.google.com",
    "Etsy": "https://www.etsy.com",
    "Reddit": "https://www.reddit.com",
    "Affirm": "https://www.affirm.com",
    "Robinhood": "https://robinhood.com",
    "Pure Storage": "https://www.purestorage.com",
    "Palo Alto Networks": "https://www.paloaltonetworks.com",
    "LinkedIn": "https://www.linkedin.com",
    "Figma": "https://www.figma.com",
    "Pinterest": "https://www.pinterest.com",
    "UiPath": "https://www.uipath.com",
    "Braze": "https://www.braze.com",
    "Fastly": "https://www.fastly.com",
    "Stripe": "https://stripe.com",
    "Slack": "https://slack.com",
    "DRW": "https://drw.com",
    "Optiver": "https://optiver.com",
    "Gusto": "https://gusto.com",
    "MongoDB": "https://www.mongodb.com",
    "Twilio": "https://www.twilio.com",
    "Spotify": "https://www.spotify.com",
    "Klaviyo": "https://www.klaviyo.com",
    "HubSpot": "https://www.hubspot.com",
    "Mixpanel": "https://mixpanel.com",
    "eBay": "https://www.ebay.com",
    "Salesforce": "https://www.salesforce.com",
    "Asana": "https://asana.com",
    "Databricks": "https://www.databricks.com",
    "HashiCorp": "https://www.hashicorp.com",
    "PagerDuty": "https://www.pagerduty.com",
    "VMware": "https://www.vmware.com",
    "Datadog": "https://www.datadoghq.com",
    "PayPal": "https://www.paypal.com",
    "Rivian": "https://rivian.com",
    "NVIDIA": "https://www.nvidia.com",
    "Okta": "https://www.okta.com",
    "CrowdStrike": "https://www.crowdstrike.com",
    "GitHub": "https://github.com",
    "Cisco": "https://www.cisco.com",
    "SoFi": "https://www.sofi.com",
    "Amazon": "https://www.amazon.com",
    "Twitch": "https://www.twitch.tv",
    "Verkada": "https://www.verkada.com",
    "Fanatics": "https://www.fanatics.com",
    "Cloudera": "https://www.cloudera.com",
    "Splunk": "https://www.splunk.com",
    "Zscaler": "https://www.zscaler.com",
    "Squarespace": "https://www.squarespace.com",
    "SeatGeek": "https://seatgeek.com",
    "Walmart": "https://www.walmart.com",
    "Cockroach Labs": "https://www.cockroachlabs.com",
    "Peloton": "https://www.onepeloton.com",
    "Niantic": "https://nianticlabs.com",
    "Oracle": "https://www.oracle.com",
    "Electronic Arts": "https://www.ea.com",
    "Cloudflare": "https://www.cloudflare.com",
    "Twitter": "https://twitter.com",
    "Disney": "https://www.disney.com",
    "Indeed": "https://www.indeed.com",
    "ServiceTitan": "https://www.servicetitan.com",
    "Fivetran": "https://www.fivetran.com",
    "Dell Technologies": "https://www.dell.com",
    "MasterClass": "https://www.masterclass.com",
    "Quora": "https://www.quora.com",
    "ServiceNow": "https://www.servicenow.com",
    "Palantir": "https://www.palantir.com",
    "Retool": "https://retool.com",
    "Qualtrics": "https://www.qualtrics.com",
    "Ramp": "https://ramp.com",
    "Microsoft": "https://www.microsoft.com",
    "Zapier": "https://zapier.com",
    "Chainalysis": "https://www.chainalysis.com",
    "Audible": "https://www.audible.com",
    "Workday": "https://www.workday.com",
    "Equinix": "https://www.equinix.com",
    "Yahoo": "https://www.yahoo.com",
    "Pandora": "https://www.pandora.com",
    "MSCI": "https://www.msci.com",
    "StockX": "https://stockx.com",
    "Vimeo": "https://vimeo.com",
    "Scale AI": "https://scale.com",
    "Qualcomm": "https://www.qualcomm.com",
    "Smartsheet": "https://www.smartsheet.com",
    "GoDaddy": "https://www.godaddy.com",
    "Duolingo": "https://www.duolingo.com",
    "Zendesk": "https://www.zendesk.com",
    "SAP": "https://www.sap.com",
    "Sentry": "https://sentry.io",
    "ZoomInfo": "https://www.zoominfo.com",
    "Webflow": "https://webflow.com",
    "DraftKings": "https://www.draftkings.com",
    "Chegg": "https://www.chegg.com",
    "GoodRx": "https://www.goodrx.com",
    "Wealthfront": "https://www.wealthfront.com",
    "Zynga": "https://www.zynga.com",
    "DigitalOcean": "https://www.digitalocean.com",
    "Citadel": "https://www.citadel.com",
    "Hudson River Trading": "https://www.hudsonrivertrading.com",
    "Jump Trading": "https://www.jumptrading.com",
    "Point72": "https://www.point72.com",
    "Bridgewater Associates": "https://www.bridgewater.com",
    "Arrowstreet Capital": "https://www.arrowstreetcapital.com",
    "Balyasny Asset Management": "https://www.bam.com",
    "Akuna Capital": "https://akunacapital.com",
    "ExodusPoint Capital Management": "https://www.exoduspoint.com",
    "Schonfeld": "https://www.schonfeld.com",
    "WorldQuant": "https://www.worldquant.com",
    "Interactive Brokers": "https://www.interactivebrokers.com",
    "Vercel": "https://vercel.com",
    "Anduril Industries": "https://www.anduril.com",
    "Mozilla": "https://www.mozilla.org",
    "Coupang": "https://www.coupang.jobs",
    "Rippling": "https://www.rippling.com",
    "Cruise": "https://www.getcruise.com",
    "Roku": "https://www.roku.com",
    "Chan Zuckerberg Initiative": "https://chanzuckerberg.com",
}
 
 
def main():
    with open("swe_firms_data.json", "r", encoding="utf-8") as f:
        data = json.load(f)
 
    # Handle both formats: plain list of strings or already-converted objects.
    firms = []
    for entry in data:
        if isinstance(entry, str):
            name = entry
            existing = None
        elif isinstance(entry, dict):
            name = entry.get("name", "")
            existing = entry
        else:
            continue
        if not name:
            continue
 
        website = (existing or {}).get("website") or WEBSITE_MAP.get(name)
        career_url = (existing or {}).get("careerUrl")
 
        firms.append({
            "name": name,
            "website": website,
            "careerUrl": career_url,
        })
 
    with open("swe_firms_data.json", "w", encoding="utf-8") as f:
        json.dump(firms, f, indent=2, ensure_ascii=False)
 
    seeded = sum(1 for f in firms if f["website"])
    print(f"Wrote {len(firms)} firms to swe_firms_data.json ({seeded} with website URLs).")
 
 
if __name__ == "__main__":
    main()