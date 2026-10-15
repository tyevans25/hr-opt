from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.lib import colors
import os

PROFILES = [
    # --- DATA SCIENCE ---
    {
        "name": "Jordan Mitchell",
        "email": "jordan.mitchell@email.com",
        "phone": "404-555-0192",
        "location": "Atlanta, GA",
        "summary": "Data scientist with 4 years of experience in machine learning, statistical modeling, and data pipeline development. Strong background in Python, SQL, and cloud platforms.",
        "experience": [
            {"title": "Senior Data Scientist", "company": "TechCorp Analytics", "dates": "Jan 2022 – Present",
             "bullets": ["Built ML models predicting customer churn with 87% accuracy using XGBoost", "Designed ETL pipelines processing 10M+ records daily using PySpark and Databricks", "Collaborated with product teams to translate business requirements into analytical solutions"]},
            {"title": "Data Analyst", "company": "Retail Insights Co.", "dates": "Jun 2020 – Dec 2021",
             "bullets": ["Developed SQL dashboards tracking KPIs for 200+ store locations", "Automated monthly reporting reducing manual work by 60%"]}
        ],
        "education": [{"degree": "M.S. Data Science", "school": "Georgia Tech", "year": "2020"}, {"degree": "B.S. Statistics", "school": "University of Georgia", "year": "2018"}],
        "skills": ["Python", "SQL", "PySpark", "Scikit-learn", "XGBoost", "Databricks", "Tableau", "Git", "AWS"]
    },
    {
        "name": "Kevin Park",
        "email": "kevin.park@email.com",
        "phone": "206-555-0123",
        "location": "Seattle, WA",
        "summary": "Applied scientist with expertise in recommendation systems, causal inference, and experimentation. 6 years driving personalization at scale.",
        "experience": [
            {"title": "Applied Scientist II", "company": "TechGiant Seattle", "dates": "Mar 2021 – Present",
             "bullets": ["Led development of recommendation system serving 20M+ users", "Designed and analyzed 50+ A/B experiments improving CTR by 15%", "Applied causal inference methods to measure long-term user engagement"]},
            {"title": "Data Scientist", "company": "E-Commerce Platform", "dates": "Aug 2018 – Feb 2021",
             "bullets": ["Built collaborative filtering models for product recommendations", "Developed experimentation framework adopted across 5 product teams"]}
        ],
        "education": [{"degree": "Ph.D. Statistics", "school": "University of Washington", "year": "2018"}, {"degree": "B.S. Mathematics", "school": "Seoul National University", "year": "2013"}],
        "skills": ["Python", "R", "SQL", "Causal Inference", "A/B Testing", "Spark", "TensorFlow", "Scala"]
    },
    {
        "name": "Emily Rodriguez",
        "email": "emily.rodriguez@email.com",
        "phone": "305-555-0789",
        "location": "Miami, FL",
        "summary": "Entry-level data analyst with 1 year of experience and strong academic background in statistics and econometrics. Quick learner passionate about data-driven decisions.",
        "experience": [
            {"title": "Junior Data Analyst", "company": "StartupHub Miami", "dates": "Jun 2025 – Present",
             "bullets": ["Analyzed user behavior data to identify product improvement opportunities", "Created weekly performance dashboards using Google Data Studio"]},
            {"title": "Data Analyst Intern", "company": "Marketing Agency FL", "dates": "Jan 2025 – May 2025",
             "bullets": ["Supported campaign performance analysis using Excel and SQL", "Built automated reports reducing manual data entry by 50%"]}
        ],
        "education": [{"degree": "B.S. Economics and Statistics", "school": "University of Miami", "year": "2025"}],
        "skills": ["Python", "SQL", "Excel", "Google Analytics", "Tableau", "R", "Statistics"]
    },

    # --- HR / PEOPLE OPERATIONS ---
    {
        "name": "Simone Barrett",
        "email": "simone.barrett@email.com",
        "phone": "678-555-0312",
        "location": "Atlanta, GA",
        "summary": "HR Business Partner with 6 years of experience driving talent strategy, employee relations, and organizational development across mid-size and enterprise companies.",
        "experience": [
            {"title": "Senior HR Business Partner", "company": "National Retail Corp", "dates": "Feb 2021 – Present",
             "bullets": ["Partnered with 8 business units supporting 1,200+ employees across 12 states", "Led annual performance management cycle including calibration and merit planning", "Reduced voluntary turnover by 18% through targeted retention programs"]},
            {"title": "HR Generalist", "company": "Staffing Solutions Inc.", "dates": "Mar 2018 – Jan 2021",
             "bullets": ["Managed full-cycle recruiting for corporate and field roles", "Administered benefits, FMLA, and ADA accommodations for 400+ employees", "Designed onboarding program improving 90-day retention by 25%"]}
        ],
        "education": [{"degree": "M.S. Human Resources Management", "school": "Georgia State University", "year": "2018"}, {"degree": "B.A. Psychology", "school": "Spelman College", "year": "2016"}],
        "skills": ["Workday", "ATS Systems", "Employee Relations", "Performance Management", "HRIS", "Recruiting", "Compensation", "Labor Law", "DEI Programs"]
    },
    {
        "name": "Daniel Novak",
        "email": "daniel.novak@email.com",
        "phone": "312-555-0678",
        "location": "Chicago, IL",
        "summary": "Talent Acquisition specialist with 4 years building high-performing teams in tech and finance. Expert in sourcing strategy, employer branding, and candidate experience.",
        "experience": [
            {"title": "Senior Talent Acquisition Partner", "company": "FinTech Unicorn", "dates": "Apr 2022 – Present",
             "bullets": ["Hired 120+ engineers, PMs, and data scientists annually", "Built campus recruiting program partnering with 15 universities", "Reduced time-to-fill from 62 to 38 days through process improvements"]},
            {"title": "Recruiter", "company": "Staffing Agency Chicago", "dates": "Jun 2020 – Mar 2022",
             "bullets": ["Managed 30+ open requisitions simultaneously across multiple clients", "Sourced passive candidates via LinkedIn, GitHub, and industry events"]}
        ],
        "education": [{"degree": "B.S. Business Administration", "school": "DePaul University", "year": "2020"}],
        "skills": ["Lever", "Greenhouse", "LinkedIn Recruiter", "Boolean Search", "Employer Branding", "Offer Negotiation", "DEI Hiring", "ATS", "Interviewing"]
    },

    # --- SOFTWARE ENGINEERING ---
    {
        "name": "Marcus Johnson",
        "email": "marcus.johnson@email.com",
        "phone": "512-555-0234",
        "location": "Austin, TX",
        "summary": "Full-stack software engineer with 5 years building scalable web applications. Passionate about clean code, system design, and developer experience.",
        "experience": [
            {"title": "Senior Software Engineer", "company": "SaaS Platform Co.", "dates": "Mar 2021 – Present",
             "bullets": ["Led migration of monolith to microservices reducing deployment time by 70%", "Built React frontend serving 500K+ monthly active users", "Mentored team of 4 junior engineers through weekly code reviews and 1:1s"]},
            {"title": "Software Engineer", "company": "Agency Dev Studio", "dates": "Jul 2019 – Feb 2021",
             "bullets": ["Delivered 10+ client projects using React, Node.js, and PostgreSQL", "Implemented CI/CD pipelines using GitHub Actions and Docker"]}
        ],
        "education": [{"degree": "B.S. Computer Science", "school": "UT Austin", "year": "2019"}],
        "skills": ["Python", "JavaScript", "TypeScript", "React", "Node.js", "PostgreSQL", "Docker", "Kubernetes", "AWS", "GraphQL"]
    },
    {
        "name": "Lena Fischer",
        "email": "lena.fischer@email.com",
        "phone": "415-555-0891",
        "location": "San Francisco, CA",
        "summary": "Backend engineer specializing in distributed systems and high-throughput APIs. 7 years experience at scale-up and enterprise companies.",
        "experience": [
            {"title": "Staff Engineer", "company": "Payments Platform Inc.", "dates": "Jan 2020 – Present",
             "bullets": ["Architected event-driven payment processing system handling $2B+ annually", "Reduced API p99 latency from 800ms to 120ms through caching and optimization", "Led technical design reviews and set engineering standards across 3 teams"]},
            {"title": "Senior Backend Engineer", "company": "Logistics Tech Co.", "dates": "Aug 2017 – Dec 2019",
             "bullets": ["Built real-time tracking API consumed by 50+ enterprise clients", "Designed database schema supporting 100M+ records with sub-10ms queries"]}
        ],
        "education": [{"degree": "M.S. Computer Science", "school": "Stanford University", "year": "2017"}, {"degree": "B.S. Computer Engineering", "school": "TU Munich", "year": "2015"}],
        "skills": ["Go", "Python", "Java", "Kafka", "PostgreSQL", "Redis", "AWS", "gRPC", "Terraform", "System Design"]
    },

    # --- HEALTHCARE ---
    {
        "name": "Aaliyah Thompson",
        "email": "aaliyah.thompson@email.com",
        "phone": "404-555-0567",
        "location": "Atlanta, GA",
        "summary": "Registered Nurse with 5 years of ICU and emergency care experience. Dedicated to evidence-based practice and patient-centered care. Charge nurse experience in high-acuity settings.",
        "experience": [
            {"title": "ICU Charge Nurse", "company": "Emory University Hospital", "dates": "Jun 2021 – Present",
             "bullets": ["Managed care for 6-8 critically ill patients per shift in 24-bed MICU", "Coordinated multidisciplinary team rounds and care planning for complex cases", "Trained 12 new graduate nurses in ICU protocols and documentation"]},
            {"title": "Emergency Department RN", "company": "Grady Memorial Hospital", "dates": "Aug 2019 – May 2021",
             "bullets": ["Triaged 40+ patients per shift in Level 1 trauma center", "Maintained Advanced Cardiac Life Support (ACLS) certification"]}
        ],
        "education": [{"degree": "B.S. Nursing", "school": "Emory University", "year": "2019"}],
        "skills": ["Critical Care", "ACLS", "BLS", "Electronic Health Records", "Epic", "Patient Assessment", "IV Therapy", "Ventilator Management", "Team Leadership"]
    },
    {
        "name": "James Okonkwo",
        "email": "james.okonkwo@email.com",
        "phone": "713-555-0345",
        "location": "Houston, TX",
        "summary": "Healthcare data analyst with 4 years leveraging clinical and administrative data to improve patient outcomes and operational efficiency. Background in biostatistics and Epic reporting.",
        "experience": [
            {"title": "Healthcare Data Analyst", "company": "Houston Methodist Hospital", "dates": "Sep 2021 – Present",
             "bullets": ["Built dashboards tracking readmission rates, HCAHPS scores, and length of stay", "Developed predictive model identifying high-risk patients for care management outreach", "Collaborated with clinical informatics team on Epic reporting and optimization"]},
            {"title": "Clinical Research Coordinator", "company": "UTHealth Houston", "dates": "May 2019 – Aug 2021",
             "bullets": ["Managed data collection for 3 NIH-funded clinical trials", "Performed statistical analysis using R and SAS for study publications"]}
        ],
        "education": [{"degree": "M.P.H. Biostatistics", "school": "UTHealth Houston", "year": "2019"}, {"degree": "B.S. Biology", "school": "Prairie View A&M", "year": "2017"}],
        "skills": ["SQL", "R", "SAS", "Epic", "Tableau", "Power BI", "ICD-10", "HIPAA", "Clinical Research", "Biostatistics"]
    },

    # --- FINANCE / ACCOUNTING ---
    {
        "name": "Sarah Chen",
        "email": "sarah.chen@email.com",
        "phone": "212-555-0234",
        "location": "New York, NY",
        "summary": "CFA charterholder and portfolio analyst with 6 years in asset management. Expertise in equity research, risk modeling, and quantitative investment strategies.",
        "experience": [
            {"title": "Senior Portfolio Analyst", "company": "Manhattan Asset Management", "dates": "Jan 2021 – Present",
             "bullets": ["Managed $800M equity portfolio with consistent alpha generation", "Built quantitative screening models using Python and Bloomberg API", "Produced quarterly investor reports and presented to institutional clients"]},
            {"title": "Equity Research Associate", "company": "Wall Street Research Group", "dates": "Jul 2018 – Dec 2020",
             "bullets": ["Covered 15 companies in the technology sector", "Built DCF and comparable company models for investment recommendations"]}
        ],
        "education": [{"degree": "M.B.A. Finance", "school": "NYU Stern", "year": "2018"}, {"degree": "B.S. Economics", "school": "Cornell University", "year": "2016"}],
        "skills": ["Python", "Bloomberg", "Excel", "SQL", "Financial Modeling", "DCF Analysis", "Risk Management", "Portfolio Analytics", "CFA", "VBA"]
    },
    {
        "name": "Roberto Vega",
        "email": "roberto.vega@email.com",
        "phone": "305-555-0123",
        "location": "Miami, FL",
        "summary": "CPA with 5 years in public accounting and corporate finance. Experienced in financial reporting, tax compliance, and internal controls under US GAAP and IFRS.",
        "experience": [
            {"title": "Senior Accountant", "company": "Deloitte Miami", "dates": "Sep 2021 – Present",
             "bullets": ["Led audit engagements for 8 mid-market clients across real estate and financial services", "Identified $1.2M in cost savings through process improvement recommendations", "Supervised team of 3 staff accountants during busy season"]},
            {"title": "Staff Accountant", "company": "Regional CPA Firm", "dates": "Jun 2019 – Aug 2021",
             "bullets": ["Prepared corporate tax returns (1120, 1120S) for 30+ clients", "Reconciled balance sheets and prepared financial statements monthly"]}
        ],
        "education": [{"degree": "M.S. Accounting", "school": "University of Miami", "year": "2019"}, {"degree": "B.S. Accounting", "school": "Florida International University", "year": "2018"}],
        "skills": ["US GAAP", "IFRS", "Excel", "QuickBooks", "SAP", "Tax Compliance", "Financial Reporting", "Internal Controls", "CPA", "Audit"]
    },

    # --- MARKETING ---
    {
        "name": "Priya Nair",
        "email": "priya.nair@email.com",
        "phone": "206-555-0456",
        "location": "Seattle, WA",
        "summary": "Digital marketing manager with 5 years growing B2B SaaS brands. Expert in demand generation, content strategy, and marketing analytics.",
        "experience": [
            {"title": "Senior Marketing Manager", "company": "B2B SaaS Co.", "dates": "Apr 2021 – Present",
             "bullets": ["Grew organic traffic 140% YoY through SEO and content marketing programs", "Managed $2M annual digital advertising budget across Google, LinkedIn, and Meta", "Built marketing attribution model improving campaign ROI measurement by 40%"]},
            {"title": "Digital Marketing Specialist", "company": "Tech Agency", "dates": "Jun 2019 – Mar 2021",
             "bullets": ["Executed paid search and social campaigns for 15+ B2B clients", "Produced monthly performance reports and optimization recommendations"]}
        ],
        "education": [{"degree": "B.S. Marketing", "school": "University of Washington", "year": "2019"}],
        "skills": ["Google Analytics", "HubSpot", "Salesforce", "SEO", "SEM", "Content Marketing", "Email Marketing", "Paid Social", "SQL", "Marketo"]
    },

    # --- OPERATIONS / SUPPLY CHAIN ---
    {
        "name": "Andre Washington",
        "email": "andre.washington@email.com",
        "phone": "404-555-0789",
        "location": "Atlanta, GA",
        "summary": "Supply chain manager with 7 years optimizing procurement, logistics, and inventory management for manufacturing and retail companies.",
        "experience": [
            {"title": "Supply Chain Manager", "company": "Manufacturing Corp SE", "dates": "Feb 2020 – Present",
             "bullets": ["Managed $50M annual procurement budget across 200+ suppliers", "Reduced inventory carrying costs by 22% through demand forecasting improvements", "Led implementation of SAP S/4HANA across 3 distribution centers"]},
            {"title": "Logistics Coordinator", "company": "Retail Distribution Co.", "dates": "May 2017 – Jan 2020",
             "bullets": ["Coordinated inbound and outbound shipments for 15 retail locations", "Negotiated carrier contracts saving $300K annually"]}
        ],
        "education": [{"degree": "M.B.A. Operations Management", "school": "Emory Goizueta", "year": "2017"}, {"degree": "B.S. Industrial Engineering", "school": "Georgia Tech", "year": "2015"}],
        "skills": ["SAP", "Excel", "SQL", "Demand Forecasting", "Procurement", "Vendor Management", "Six Sigma", "Lean", "ERP Systems", "Power BI"]
    },

    # --- LEGAL ---
    {
        "name": "Maya Chen",
        "email": "maya.chen@email.com",
        "phone": "212-555-0678",
        "location": "New York, NY",
        "summary": "Corporate attorney with 4 years specializing in M&A transactions, securities law, and corporate governance at a top-tier law firm.",
        "experience": [
            {"title": "Associate Attorney", "company": "Sullivan & Cromwell LLP", "dates": "Sep 2021 – Present",
             "bullets": ["Advised on 12 M&A transactions totaling $4B+ in deal value", "Drafted purchase agreements, disclosure schedules, and ancillary transaction documents", "Conducted due diligence and coordinated cross-border regulatory filings"]},
            {"title": "Summer Associate", "company": "Kirkland & Ellis LLP", "dates": "May 2020 – Aug 2020",
             "bullets": ["Researched securities law issues for PE-backed transactions", "Drafted sections of merger agreements and board resolutions"]}
        ],
        "education": [{"degree": "J.D.", "school": "Columbia Law School", "year": "2021"}, {"degree": "B.A. Political Science", "school": "Yale University", "year": "2018"}],
        "skills": ["M&A", "Securities Law", "Corporate Governance", "Due Diligence", "Contract Drafting", "Bloomberg Law", "Westlaw", "SEC Filings", "Private Equity", "Negotiation"]
    },

    # --- EDUCATION ---
    {
        "name": "Keisha Robinson",
        "email": "keisha.robinson@email.com",
        "phone": "678-555-0234",
        "location": "Atlanta, GA",
        "summary": "High school mathematics teacher with 6 years of classroom experience. Passionate about making STEM accessible to underrepresented students. Department chair experience.",
        "experience": [
            {"title": "Mathematics Department Chair", "company": "Fulton County Schools", "dates": "Aug 2021 – Present",
             "bullets": ["Led team of 8 math teachers across AP Calculus through remedial courses", "Raised student proficiency rates from 58% to 74% over 3 years", "Designed curriculum aligned with Georgia Standards of Excellence"]},
            {"title": "High School Math Teacher", "company": "Atlanta Public Schools", "dates": "Aug 2018 – Jul 2021",
             "bullets": ["Taught Algebra II, Pre-Calculus, and AP Statistics to 120+ students", "Mentored 15 students through college application process"]}
        ],
        "education": [{"degree": "M.Ed. Curriculum and Instruction", "school": "Georgia State University", "year": "2018"}, {"degree": "B.S. Mathematics", "school": "Morehouse College", "year": "2016"}],
        "skills": ["Curriculum Development", "Differentiated Instruction", "Google Classroom", "Canvas LMS", "Data-Driven Instruction", "STEM Education", "AP Curriculum", "Student Assessment", "Parent Communication"]
    },

    # --- PRODUCT MANAGEMENT ---
    {
        "name": "Hassan Ali",
        "email": "hassan.ali@email.com",
        "phone": "415-555-0123",
        "location": "San Francisco, CA",
        "summary": "Product manager with 5 years building consumer and B2B products at high-growth startups. Data-driven decision maker with strong technical background.",
        "experience": [
            {"title": "Senior Product Manager", "company": "Growth Stage Startup", "dates": "Jun 2021 – Present",
             "bullets": ["Owned core checkout product driving $120M ARR", "Launched 3 major features increasing conversion rate by 12%", "Collaborated with engineering, design, and data teams in 2-week sprint cycles"]},
            {"title": "Product Manager", "company": "B2B SaaS Platform", "dates": "Jan 2019 – May 2021",
             "bullets": ["Defined roadmap for enterprise integrations used by 500+ companies", "Conducted 50+ customer interviews to shape product strategy"]}
        ],
        "education": [{"degree": "M.B.A.", "school": "UC Berkeley Haas", "year": "2019"}, {"degree": "B.S. Computer Science", "school": "UCLA", "year": "2017"}],
        "skills": ["Product Strategy", "Roadmapping", "A/B Testing", "SQL", "Figma", "JIRA", "User Research", "Agile", "Go-to-Market", "OKRs"]
    },

    # --- CYBERSECURITY ---
    {
        "name": "Tyler Brooks",
        "email": "tyler.brooks@email.com",
        "phone": "703-555-0456",
        "location": "Washington, DC",
        "summary": "Cybersecurity analyst with 4 years protecting enterprise infrastructure. CISSP certified with expertise in threat detection, incident response, and security architecture.",
        "experience": [
            {"title": "Senior Security Analyst", "company": "Federal Contractor DC", "dates": "Mar 2021 – Present",
             "bullets": ["Monitored SIEM alerts and investigated 500+ security incidents annually", "Led purple team exercises improving detection coverage by 35%", "Developed security policies and procedures for FedRAMP compliance"]},
            {"title": "SOC Analyst", "company": "Managed Security Provider", "dates": "Jun 2019 – Feb 2021",
             "bullets": ["Triaged Level 1 and Level 2 alerts across 20+ client environments", "Performed malware analysis and threat hunting using Splunk and CrowdStrike"]}
        ],
        "education": [{"degree": "B.S. Cybersecurity", "school": "George Mason University", "year": "2019"}],
        "skills": ["SIEM", "Splunk", "CrowdStrike", "Incident Response", "Threat Hunting", "Penetration Testing", "NIST", "FedRAMP", "Python", "CISSP"]
    },
]


def build_resume(profile: dict, output_path: str):
    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        rightMargin=0.75*inch,
        leftMargin=0.75*inch,
        topMargin=0.75*inch,
        bottomMargin=0.75*inch
    )

    styles = getSampleStyleSheet()
    story = []

    name_style = ParagraphStyle('Name', fontSize=20, fontName='Helvetica-Bold', alignment=TA_CENTER, spaceAfter=4)
    contact_style = ParagraphStyle('Contact', fontSize=10, fontName='Helvetica', alignment=TA_CENTER, spaceAfter=12, textColor=colors.HexColor('#555555'))
    section_style = ParagraphStyle('Section', fontSize=11, fontName='Helvetica-Bold', spaceBefore=12, spaceAfter=4, textColor=colors.HexColor('#1A1A1A'))
    body_style = ParagraphStyle('Body', fontSize=10, fontName='Helvetica', spaceAfter=4, leading=14)
    bullet_style = ParagraphStyle('Bullet', fontSize=10, fontName='Helvetica', spaceAfter=3, leftIndent=12, leading=14)
    small_style = ParagraphStyle('Small', fontSize=9, fontName='Helvetica', textColor=colors.HexColor('#666666'), spaceAfter=4)

    story.append(Paragraph(profile["name"], name_style))
    story.append(Paragraph(f"{profile['email']} | {profile['phone']} | {profile['location']}", contact_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#CCCCCC')))
    story.append(Spacer(1, 8))

    story.append(Paragraph("PROFESSIONAL SUMMARY", section_style))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#DDDDDD')))
    story.append(Spacer(1, 4))
    story.append(Paragraph(profile["summary"], body_style))

    story.append(Paragraph("EXPERIENCE", section_style))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#DDDDDD')))
    story.append(Spacer(1, 4))
    for exp in profile["experience"]:
        story.append(Paragraph(f"<b>{exp['title']}</b> — {exp['company']}", body_style))
        story.append(Paragraph(exp["dates"], small_style))
        for bullet in exp["bullets"]:
            story.append(Paragraph(f"• {bullet}", bullet_style))
        story.append(Spacer(1, 6))

    story.append(Paragraph("EDUCATION", section_style))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#DDDDDD')))
    story.append(Spacer(1, 4))
    for edu in profile["education"]:
        story.append(Paragraph(f"<b>{edu['degree']}</b> — {edu['school']} ({edu['year']})", body_style))

    story.append(Paragraph("SKILLS", section_style))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#DDDDDD')))
    story.append(Spacer(1, 4))
    story.append(Paragraph(", ".join(profile["skills"]), body_style))

    doc.build(story)
    print(f"Generated: {output_path}")


if __name__ == "__main__":
    os.makedirs("test_resumes", exist_ok=True)
    for profile in PROFILES:
        filename = f"test_resumes/{profile['name'].replace(' ', '_')}.pdf"
        build_resume(profile, filename)
    print(f"\nGenerated {len(PROFILES)} test resumes in test_resumes/")
