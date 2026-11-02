"""Build research/pai_table1.json from the official text of Delegated Regulation (EU) 2022/1288.

Indicator names and metric wording are copied programmatically from the EUR-Lex HTML
(research/sources/rts_2022_1288.html, converted to research/sources/txt/rts.txt), never retyped.
Everything under "fund*" that is not quoted, and everything under "companyInputs", is our own
derivation and is labelled as such in the output.

Usage: python3 -I research/build_pai_table1.py research/sources/txt/rts.txt research/pai_table1.json
"""
import json
import sys

SOURCE_URL = "https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32022R1288"
RETRIEVED = "2026-10-25"

# Fund-level unit for each Table 1 row. "stated" = the unit is in the RTS metric text itself;
# "formula" = read off the Annex I formula images; "implied" = not in the RTS metric text, derived
# from the definitions the RTS refers to.
FUND_UNITS = {
    1: ("tCO2e", "implied", "Not stated in Table 1. Formula (1) sums investee Scope(x) GHG emissions weighted by current value of investment / enterprise value; GHG emissions are defined via Regulation (EU) 2018/842 (CO2 equivalent), so the unit is tonnes of CO2 equivalent."),
    2: ("tCO2e per EUR million invested", "formula", "Formula (2): denominator 'current value of all investments (€M)'."),
    3: ("tCO2e per EUR million revenue", "formula", "Formula (3): investee Scope 1, 2 and 3 GHG emissions / 'investee company's €M revenue', weighted by share of investment value."),
    4: ("%", "stated", "'Share of investments'."),
    5: ("%", "stated", "'expressed as a percentage of total energy sources'."),
    6: ("GWh per million EUR of revenue", "stated", "Stated in the metric."),
    7: ("%", "stated", "'Share of investments'."),
    8: ("tonnes per million EUR invested", "stated", "Stated in the metric."),
    9: ("tonnes per million EUR invested", "stated", "Stated in the metric."),
    10: ("%", "stated", "'Share of investments'."),
    11: ("%", "stated", "'Share of investments'."),
    12: ("%", "stated", "Annex I definition (23): difference in average gross hourly earnings 'as a percentage of average gross hourly earnings of male paid employees'."),
    13: ("%", "stated", "'expressed as a percentage of all board members'."),
    14: ("%", "stated", "'Share of investments'."),
}

# What a founder would report so the fund can compute the indicator. OUR DERIVATION, not RTS text.
COMPANY_INPUTS = {
    1: [
        {"id": "ghg_scope1", "label": "Scope 1 GHG emissions", "unit": "tCO2e", "type": "number"},
        {"id": "ghg_scope2", "label": "Scope 2 GHG emissions", "unit": "tCO2e", "type": "number"},
        {"id": "ghg_scope3", "label": "Scope 3 GHG emissions", "unit": "tCO2e", "type": "number"},
    ],
    2: [],  # computed by the fund from #1 plus current value of investment and enterprise value
    3: [],  # computed by the fund from #1 plus investee revenue (held by the fund's finance team)
    4: [{"id": "fossil_fuel_activity", "label": "Active in the fossil fuel sector", "unit": "yes/no", "type": "boolean"}],
    5: [
        {"id": "energy_cons_renewable", "label": "Renewable energy consumption", "unit": "MWh", "type": "number"},
        {"id": "energy_cons_nonrenewable", "label": "Non-renewable energy consumption", "unit": "MWh", "type": "number"},
        {"id": "energy_prod_renewable", "label": "Renewable energy production", "unit": "MWh", "type": "number"},
        {"id": "energy_prod_nonrenewable", "label": "Non-renewable energy production", "unit": "MWh", "type": "number"},
    ],
    6: [],  # computed from #5 consumption inputs, revenue and the company's NACE section (fund-side)
    7: [{"id": "biodiversity_sensitive_sites", "label": "Sites or operations in or near biodiversity-sensitive areas that negatively affect those areas", "unit": "yes/no", "type": "boolean"}],
    8: [{"id": "emissions_to_water", "label": "Emissions to water", "unit": "tonnes", "type": "number"}],
    9: [{"id": "hazardous_radioactive_waste", "label": "Hazardous waste and radioactive waste", "unit": "tonnes", "type": "number"}],
    10: [{"id": "ungc_oecd_violation", "label": "Involved in violations of the UNGC principles or OECD Guidelines for Multinational Enterprises", "unit": "yes/no", "type": "boolean"}],
    11: [{"id": "ungc_oecd_processes", "label": "Policies to monitor compliance with the UNGC principles or OECD Guidelines, or grievance/complaints handling mechanisms", "unit": "yes/no", "type": "boolean"}],
    12: [{"id": "gender_pay_gap", "label": "Unadjusted gender pay gap", "unit": "%", "type": "number"}],
    13: [
        {"id": "board_female", "label": "Female board members", "unit": "count", "type": "integer"},
        {"id": "board_male", "label": "Male board members", "unit": "count", "type": "integer"},
        {"id": "board_nonbinary", "label": "Non-binary board members", "unit": "count", "type": "integer"},
    ],
    14: [{"id": "controversial_weapons", "label": "Involved in the manufacture or selling of controversial weapons", "unit": "yes/no", "type": "boolean"}],
}

OPTIONAL_INPUTS = {
    ("Table 2", 4): [{"id": "carbon_reduction_initiative", "label": "Carbon emission reduction initiatives aimed at aligning with the Paris Agreement", "unit": "yes/no", "type": "boolean"}],
    ("Table 3", 4): [{"id": "supplier_code_of_conduct", "label": "Supplier code of conduct in place", "unit": "yes/no", "type": "boolean"}],
}

SECTION_HEADERS = {
    "CLIMATE AND OTHER ENVIRONMENT-RELATED INDICATORS",
    "INDICATORS FOR SOCIAL AND EMPLOYEE, RESPECT FOR HUMAN RIGHTS, ANTI-CORRUPTION AND ANTI-BRIBERY MATTERS",
}
THEMES = {"Greenhouse gas emissions", "Biodiversity", "Water", "Waste", "Social and employee matters"}


def parse_table1(lines):
    start = lines.index("Table 1")
    begin = lines.index("Indicators applicable to investments in investee companies", start)
    end = lines.index("Indicators applicable to investments in sovereigns and supranationals", begin)
    block = lines[begin + 1:end]
    # skip the column header row
    block = block[block.index("Actions taken, and actions planned and targets set for the next reference period") + 1:]
    rows, section, theme, i = [], None, None, 0
    while i < len(block):
        line = block[i]
        if line in SECTION_HEADERS:
            section = line
        elif line in THEMES:
            theme = line
        elif line.rstrip(".").isdigit():
            num = int(line.rstrip("."))
            indicator = block[i + 1]
            metrics, j = [], i + 2
            while j < len(block) and not block[j].rstrip(".").isdigit() and block[j] not in SECTION_HEADERS and block[j] not in THEMES:
                metrics.append(block[j])
                j += 1
            rows.append({"number": num, "section": section, "theme": theme, "indicator": indicator, "metric": metrics})
            i = j
            continue
        i += 1
    return rows


def find_row(lines, table_title, num):
    start = lines.index(table_title)
    k = lines.index(f"{num}.", start)
    return {"indicator": lines[k + 1], "metric": [lines[k + 2]]}


def main(src, out):
    lines = [l.strip() for l in open(src, encoding="utf-8") if l.strip()]
    rows = parse_table1(lines)
    assert [r["number"] for r in rows] == list(range(1, 15)), [r["number"] for r in rows]
    assert rows[0]["metric"] == ["Scope 1 GHG emissions", "Scope 2 GHG emissions", "Scope 3 GHG emissions", "Total GHG emissions"]
    indicators = []
    for r in rows:
        unit, how, note = FUND_UNITS[r["number"]]
        indicators.append({
            "table": "Table 1",
            "number": r["number"],
            "ref": f"Table 1, #{r['number']}",
            "section": r["section"],
            "theme": r["theme"],
            "indicator": r["indicator"],
            "metric": r["metric"] if len(r["metric"]) > 1 else r["metric"][0],
            "fundUnit": unit,
            "fundUnitBasis": how,
            "fundUnitNote": note,
            "companyInputs": COMPANY_INPUTS[r["number"]],
        })
    optional = []
    for (table, num), inputs in OPTIONAL_INPUTS.items():
        title_line = "Table 2" if table == "Table 2" else "Table 3"
        row = find_row(lines, title_line, num)
        optional.append({
            "table": table, "number": num, "ref": f"{table}, #{num}",
            "indicator": row["indicator"], "metric": row["metric"][0],
            "fundUnit": "%", "fundUnitBasis": "stated", "fundUnitNote": "'Share of investments'.",
            "companyInputs": inputs,
        })
    doc = {
        "source": {
            "title": "Commission Delegated Regulation (EU) 2022/1288, Annex I",
            "url": SOURCE_URL,
            "retrieved": RETRIEVED,
            "verbatimFields": ["section", "theme", "indicator", "metric"],
            "derivedFields": ["fundUnit (when fundUnitBasis is 'formula' or 'implied')", "companyInputs"],
        },
        "referencePeriod": {
            "period": "annual: 1 January to 31 December of the preceding year",
            "basis": "Art. 4(1): statement published by 30 June each year, covering 1 January until 31 December of the preceding year.",
            "averaging": "Art. 6(3): the 'Impact' column is the average of impacts on 31 March, 30 June, 30 September and 31 December.",
        },
        "indicators": indicators,
        "optionalIndicators": optional,
    }
    with open(out, "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"wrote {out}: {len(indicators)} Table 1 rows, {len(optional)} optional rows")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
