"""
CareerGuide AI Chatbot Engine
NLP & Machine Learning Semantic Similarity Career Counseling Service
Complies with Functional Requirement FR-07, Table 2-8, Table 4-7, and Architecture Figure 3-37.
"""

import re
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

SYNONYMS = {
    r"\buni\b": "university",
    r"\bunis\b": "universities",
    r"\bengg\b": "engineering",
    r"\bengr\b": "engineering",
    r"\bcomp\b": "computer",
    r"\bmed\b": "medical",
    r"\bpre-med\b": "pre medical",
    r"\bpre-eng\b": "pre engineering",
    r"\bprep\b": "preparation",
    r"\bagg\b": "aggregate merit",
    r"\baggre\b": "aggregate merit",
    r"\bmerit formula\b": "aggregate calculation formula",
    r"\bfee\b": "fees structure",
    r"\bdoc\b": "doctor",
    r"\bvs\b": "versus difference",
    r"\bdiff\b": "difference",
    r"\bscope\b": "scope salary career job market",
}

EXPANDED_KNOWLEDGE_BASE = [
    # 1. CS vs SE
    {
        "id": "cs_vs_se",
        "category": "Technology",
        "keywords": ["cs vs se", "difference between cs and se", "computer science vs software engineering", "bs cs or bs se", "cs or software engineering", "software engineering or computer science"],
        "patterns": [
            "difference between computer science and software engineering",
            "cs vs se which is better in pakistan",
            "should i choose bs cs or bs software engineering",
            "which degree has more scope cs or software engineering",
            "comparison between bs cs and bs se",
            "is software engineering better than computer science"
        ],
        "response": "Computer Science (CS) focuses on theoretical computation, algorithm design, artificial intelligence, and operating systems. Software Engineering (SE) focuses on practical software development methodologies, testing, system architecture, and project management. In Pakistan's industry, both degrees qualify you for the exact same high-paying jobs (Software Engineer, Full-Stack Dev, Mobile Developer, Data Scientist). If you love math and algorithms, choose CS; if you prefer building structured software systems, choose SE.",
        "links": [{"label": "Explore CS Universities", "link": "/university-recommender"}, {"label": "Career Assessment", "link": "/result"}]
    },

    # 2. CS vs AI
    {
        "id": "cs_vs_ai",
        "category": "Technology",
        "keywords": ["cs vs ai", "computer science vs artificial intelligence", "bs cs or bs ai", "should i do ai or cs", "ai or computer science"],
        "patterns": [
            "difference between computer science and artificial intelligence",
            "cs vs ai which is better",
            "should i choose bs cs or bs ai",
            "is bs ai better than bs cs in pakistan",
            "scope of bs ai versus bs computer science"
        ],
        "response": "BS Computer Science provides a broad, versatile computing foundation (web, mobile, cloud, databases, networking, and algorithms). BS Artificial Intelligence is a specialized computing degree focusing heavily on machine learning, deep learning, computer vision, and NLP. If you are 100% committed to machine learning and data science, BS AI is excellent. If you want maximum career flexibility across all tech domains, BS CS is safer because you can specialize in AI during your final year or master's.",
        "links": [{"label": "Top Tech Universities", "link": "/university-recommender"}]
    },

    # 3. CS vs Data Science
    {
        "id": "cs_vs_ds",
        "category": "Technology",
        "keywords": ["cs vs data science", "bs cs vs bs data science", "data science or computer science", "data science vs software engineering"],
        "patterns": [
            "difference between computer science and data science",
            "bs cs vs bs data science which is better",
            "should i choose data science or computer science",
            "scope of bs data science in pakistan",
            "data science vs software engineering"
        ],
        "response": "BS Data Science focuses on statistics, big data processing, data visualization, business analytics, and predictive modeling (using Python, R, and SQL). BS Computer Science covers broad software development, systems, and algorithms. In Pakistan and internationally, Data Scientists command top starting salaries (PKR 80k–150k+). Choose Data Science if you enjoy statistics and business insights; choose CS if you want broader software engineering versatility.",
        "links": [{"label": "University Recommender", "link": "/university-recommender"}]
    },

    # 4. Scope of AI in Pakistan
    {
        "id": "ai_scope",
        "category": "Technology",
        "keywords": ["scope of ai", "scope of artificial intelligence", "ai scope in pakistan", "jobs in ai", "scope of bs ai", "bs ai in pakistan"],
        "patterns": [
            "what is the scope of artificial intelligence in pakistan",
            "scope of ai in pakistan salary and jobs",
            "future of artificial intelligence degree in pakistan",
            "is ai degree worth it in pakistan",
            "job opportunities in artificial intelligence"
        ],
        "response": "Artificial Intelligence is one of the highest-growth tech sectors in Pakistan. Key job roles include Machine Learning Engineer, NLP Specialist, Computer Vision Engineer, and AI Prompt/LLM Integrator. Starting salaries range from PKR 70,000 to 140,000+, with immense remote freelance and foreign employment opportunities. Universities with top AI labs include NUST, FAST-NUCES, Air University, and ITU Lahore.",
        "links": [{"label": "Find AI Universities", "link": "/university-recommender"}]
    },

    # 5. Cyber Security Scope
    {
        "id": "cyber_security_scope",
        "category": "Technology",
        "keywords": ["cyber security", "scope of cyber security", "bs cyber security", "ethical hacking"],
        "patterns": [
            "scope of cyber security in pakistan",
            "bs cyber security careers and jobs",
            "is cyber security a good degree in pakistan",
            "ethical hacking and information security jobs",
            "top universities for cyber security in pakistan"
        ],
        "response": "Cyber Security is in critical demand across banking, defense, telecom, and multinational sectors in Pakistan. Key job roles include SOC Analyst, Information Security Officer, Penetration Tester, and Ethical Hacker. Top universities offering BS Cyber Security include NUST, Air University, FAST, and Bahria University. Certifications like CompTIA Security+, CEH, and OSCP dramatically boost your career prospects.",
        "links": [{"label": "Find Cyber Security Universities", "link": "/university-recommender"}]
    },

    # 6. Pre-Medical to CS Transition
    {
        "id": "pre_med_to_cs",
        "category": "Technology",
        "keywords": ["pre med to cs", "pre medical student do cs", "computer science after pre medical", "cs after fsc pre medical", "pre medical software engineering", "pre medical students apply", "pre med apply for cs", "pre med can apply for bs cs"],
        "patterns": [
            "can pre medical student do computer science in pakistan",
            "can i do bs cs after fsc pre medical",
            "is math compulsory for bs cs if i did pre med",
            "can pre medical apply in fast or nust for cs",
            "admission in computer science for pre med students",
            "can pre medical students apply for software engineering"
        ],
        "response": "Yes! Under the updated Higher Education Commission (HEC) policy, FSc Pre-Medical students are 100% eligible to apply for BS Computer Science, Software Engineering, Artificial Intelligence, Cyber Security, and Data Science across all universities in Pakistan (including FAST, NUST, COMSATS, and UMT). Admitted pre-medical students take 6 credit hours of basic deficiency mathematics during their first year.",
        "links": [{"label": "Check Eligible Universities", "link": "/university-recommender"}]
    },

    # 7. Options after FSc Pre-Medical (Medical Alternatives)
    {
        "id": "options_after_pre_med",
        "category": "Medical",
        "keywords": ["after fsc pre medical", "options after pre medical", "careers after pre medical other than mbbs", "career options after pre medical", "fail mdcat", "failed mdcat", "low marks in mdcat", "alternatives if i fail mdcat", "alternatives to mbbs"],
        "patterns": [
            "what to do after fsc pre medical in pakistan",
            "career options after fsc pre medical other than mbbs",
            "what are the best fields after pre medical",
            "what to do if i do not get admission in mbbs",
            "alternatives to mbbs in pakistan",
            "fields for pre medical students without mdcat",
            "alternatives if i fail mdcat"
        ],
        "response": "Top career pathways after FSc Pre-Medical in Pakistan:\n1. Medical & Dental: MBBS, BDS (requires MDCAT aggregate 90%+).\n2. Allied Healthcare: Pharm-D (Doctor of Pharmacy - 5 yrs), DPT (Doctor of Physical Therapy - 5 yrs), BS Medical Lab Technology (MLT), BS Radiography/Imaging.\n3. Biological Sciences: BS Biotechnology, BS Bioinformatics, BS Biochemistry, BS Microbiology.\n4. Computing (No MDCAT needed): BS Computer Science, BS Software Engineering, BS Artificial Intelligence.\n5. Business & Social Sciences: BBA, BS Accounting & Finance, BS Psychology.",
        "links": [{"label": "Explore Healthcare Degrees", "link": "/university-recommender"}, {"label": "Take Career Quiz", "link": "/quiz"}]
    },

    # 8. Options after FSc Pre-Engineering
    {
        "id": "options_after_pre_eng",
        "category": "Engineering",
        "keywords": ["after fsc pre engineering", "options after pre engineering", "careers after pre engineering", "after pre engineering"],
        "patterns": [
            "what to do after fsc pre engineering in pakistan",
            "career options after fsc pre engineering",
            "best fields after pre engineering other than engineering",
            "which degree is best for pre engineering students"
        ],
        "response": "Top career pathways after FSc Pre-Engineering in Pakistan:\n1. Computing & IT (Highest immediate demand): BS CS, BS Software Engineering, BS AI, BS Data Science, BS Cyber Security.\n2. Core Engineering: Electrical Engineering, Mechanical Engineering, Civil Engineering, Chemical Engineering, Mechatronics, Aerospace (requires ECAT/NET and PEC accreditation).\n3. Architecture & Industrial Design: B.Arch (5-year architecture degree at NUST, NCA, UET).\n4. Aviation: BS Aviation Management, Commercial Pilot License (CPL).\n5. Business & Analytics: BS Data Analytics, BS Accounting & Finance, BBA.",
        "links": [{"label": "Find Engineering Universities", "link": "/university-recommender"}]
    },

    # 9. Options after ICS
    {
        "id": "options_after_ics",
        "category": "Technology",
        "keywords": ["after ics", "options after ics", "careers after ics", "what to do after ics"],
        "patterns": [
            "what to do after ics in pakistan",
            "best degree options after ics",
            "can ics students do software engineering",
            "can ics students apply for engineering universities",
            "top fields for ics students in pakistan"
        ],
        "response": "Top degrees for ICS students in Pakistan:\n1. Computing Degrees: BS Computer Science, BS Software Engineering, BS AI, BS Data Science, BS Cyber Security, BS Information Technology.\n2. Engineering (If ICS was with Physics): Software Engineering, Telecommunications, Computer Systems Engineering.\n3. Business & Finance (If ICS was with Stats/Economics): BS FinTech, BS Accounting & Finance, BS Business Analytics, BBA.\n4. Creative Media: BS Game Development, UI/UX Design, Digital Animation.\nICS provides a strong programming and math headstart for university computing programs.",
        "links": [{"label": "University Recommender", "link": "/university-recommender"}]
    },

    # 10. Options after I.Com
    {
        "id": "options_after_icom",
        "category": "Business",
        "keywords": ["after icom", "options after icom", "what to do after i com", "careers after icom"],
        "patterns": [
            "what to do after icom in pakistan",
            "best career options after i com",
            "which degree is best for icom students",
            "can icom students do ca or bba"
        ],
        "response": "Top career pathways after I.Com in Pakistan:\n1. Chartered Accountancy (CA via ICAP): Premier auditing and corporate finance qualification.\n2. ACCA: Globally recognized financial accounting qualification with fast-track exam exemptions.\n3. BS Accounting & Finance: 4-year degree leading to banking, investment, and corporate finance roles.\n4. BBA: Broad business management, marketing, and supply chain.\n5. BS FinTech & E-Commerce: High-growth digital banking and online commerce.\n6. Law (BS LLB): Accessible by clearing the HEC LAT test.",
        "links": [{"label": "Browse Business Scholarships", "link": "/scholarships"}]
    },

    # 11. Options after FA / Arts
    {
        "id": "options_after_fa",
        "category": "Arts",
        "keywords": ["after fa", "options after fa", "what to do after fa", "careers after arts"],
        "patterns": [
            "what to do after fa in pakistan",
            "best degrees after fa arts",
            "career options for fa students in pakistan",
            "can fa students do law or bba"
        ],
        "response": "Top career pathways after FA / Arts in Pakistan:\n1. Law (BS LLB 5-years): One of the most prestigious routes after clearing HEC LAT.\n2. BS Psychology: Clinical, counseling, and organizational psychology careers.\n3. Media & Mass Communication: Journalism, digital broadcasting, public relations, and advertising.\n4. Fine Arts & Design: Graphic Design, Textile Design, Interior Architecture (NCA, BNU, PIFD).\n5. International Relations & Political Science: Prepares for civil services (CSS / PMS exams).\n6. BBA / Hotel Management / Tourism.",
        "links": [{"label": "View Degree Programs", "link": "/university-recommender"}]
    },

    # 12. Merit Calculation Formulas
    {
        "id": "merit_formulas",
        "category": "Admissions",
        "keywords": ["merit formula", "how aggregate is calculated", "aggregate formula", "how to calculate aggregate", "calculate aggregate formula for nust", "merit formula for universities", "fast merit", "fast aggregate", "nust merit", "comsats merit", "mdcat aggregate formula"],
        "patterns": [
            "how to calculate university aggregate in pakistan",
            "what is the merit formula for universities",
            "how to calculate merit for nust fast comsats mdcat",
            "formula for aggregate calculation in pakistan",
            "how is admission merit calculated",
            "what is fast merit formula"
        ],
        "response": "Standard admission aggregate formulas in Pakistan:\n• NUST: 75% NET Entry Test + 15% FSc/HSSC-1 + 10% Matric/SSC.\n• FAST-NUCES: 50% NU Entry Test + 50% FSc/Matric.\n• Medical (PMDC): 50% MDCAT + 40% FSc Pre-Medical + 10% Matric.\n• COMSATS: 50% NTS-NAT Test + 40% FSc + 10% Matric.\n• UET Engineering (ECAT): 33% ECAT + 50% FSc + 17% Matric.\nYou can calculate your exact aggregate automatically on our University Recommender page!",
        "links": [{"label": "Calculate Your Aggregate", "link": "/university-recommender"}]
    },

    # 13. Top CS Universities Comparison (FAST vs NUST)
    {
        "id": "fast_vs_nust_cs",
        "category": "Technology",
        "keywords": ["fast vs nust", "nust vs fast for cs", "which is better fast or nust", "fast or nust for computer science", "fast vs nust for cs"],
        "patterns": [
            "which is better fast or nust for computer science",
            "fast vs nust for bs cs in pakistan",
            "should i choose fast or nust for software engineering",
            "comparison between fast and nust computer science",
            "is fast better than nust for coding"
        ],
        "response": "FAST-NUCES vs NUST for Computer Science:\n• FAST-NUCES is widely acknowledged by software houses as the premier coding and software development school in Pakistan. Academic grading is notoriously rigorous, producing elite coders with immediate industry placement.\n• NUST offers a complete university experience: world-class campus, vibrant international exposure, superior QS global ranking, diverse campus societies, and state-of-the-art research labs.\nVerdict: If your goal is pure hardcore programming and fast-paced software development, FAST is unmatched. If you want a balanced lifestyle, high global ranking for foreign master's degrees, and broader prestige, choose NUST.",
        "links": [{"label": "Compare University Cutoffs", "link": "/university-recommender"}]
    },

    # 14. Best Universities for Computer Science
    {
        "id": "top_cs_universities",
        "category": "Technology",
        "keywords": ["best universities for computer science", "top cs universities in pakistan", "best cs universities", "top software engineering universities"],
        "patterns": [
            "what are the best universities for computer science",
            "top cs universities in pakistan",
            "which university is best for bs cs in pakistan",
            "best software engineering universities in pakistan",
            "ranking of computer science universities in pakistan"
        ],
        "response": "The top universities for Computer Science and Software Engineering in Pakistan are:\n1. FAST-NUCES (Islamabad, Lahore, Karachi, Peshawar) - Renowned for elite software development.\n2. NUST (SEECS, Islamabad) - Outstanding global ranking, research facilities, and campus life.\n3. COMSATS (Islamabad, Lahore) - High HEC ranking, excellent faculty, and affordable merit quotas.\n4. PUCIT / ITU Lahore - Premier provincial computing schools with strong competitive programming cultures.\n5. GIKI (Topi, KPK) - Excellent technological infrastructure and alumni network.",
        "links": [{"label": "University Recommender", "link": "/university-recommender"}]
    },

    # 15. NUST Entry Test (NET) Guide
    {
        "id": "nust_net_guide",
        "category": "Admissions",
        "keywords": ["nust net test", "how to prepare net", "net series dates", "nust entry test preparation", "prepare for net", "prepare for net test", "net test preparation"],
        "patterns": [
            "how to prepare for nust net entry test",
            "what is net entry test format and syllabus",
            "how many net series are held by nust",
            "tips to score 150+ in nust net",
            "nust test dates and passing marks",
            "how to prepare for net test"
        ],
        "response": "NUST Entry Test (NET) Guide:\n• Format: Computer-based test of 200 MCQs in 3 hours. Engineering/CS test consists of: 85 Mathematics, 60 Physics, 40 Chemistry/Computer, 10 English, 5 Intelligence questions. No negative marking!\n• Series: Held in 4 series (NET-1 in Dec, NET-2 in Feb, NET-3 in April, NET-4 in June/July). Your best score is used for admission.\n• Preparation: Thoroughly study Punjab and Federal Board textbooks. Practice past papers from OETP, KIPS FUNG series, and STEP.",
        "links": [{"label": "University Recommender", "link": "/university-recommender"}]
    },

    # 16. MDCAT Preparation & Passing Marks
    {
        "id": "mdcat_guide",
        "category": "Medical",
        "keywords": ["mdcat preparation", "mdcat passing marks", "mdcat syllabus", "how to crack mdcat", "what are passing marks for mdcat"],
        "patterns": [
            "how to prepare for mdcat in pakistan",
            "what are passing marks for mdcat",
            "mdcat syllabus and weightage by pmdc",
            "tips to score high in mdcat exam",
            "mdcat test dates and pattern"
        ],
        "response": "MDCAT (Medical & Dental College Admission Test) Guide:\n• Pattern: 200 MCQs covering Biology (68), Chemistry (54), Physics (54), English (18), and Logical Reasoning (6). No negative marking.\n• Passing Criteria: 55% for MBBS and 50% for BDS eligibility.\n• Preparation: Stick strictly to provincial biology and chemistry textbooks (Punjab/Sindh/KPK board books). Solve past 10 years PMDC/UHS past papers and memorize high-yield reaction mechanisms and biological diagrams.",
        "links": [{"label": "Browse Medical Universities", "link": "/university-recommender"}]
    },

    # 17. ECAT Guide (UET Engineering)
    {
        "id": "ecat_guide",
        "category": "Engineering",
        "keywords": ["ecat preparation", "ecat test format", "uet ecat exam", "ecat syllabus", "ecat test"],
        "patterns": [
            "what is ecat test for engineering in punjab",
            "how to prepare for uet ecat exam",
            "ecat negative marking and syllabus",
            "uet admission test ecat guide"
        ],
        "response": "ECAT (Engineering College Admission Test) is conducted by UET Lahore for admission to public engineering universities in Punjab. Format: 100 MCQs (30 Math, 30 Physics, 30 Chemistry/Computer, 10 English). Each correct answer gives +4 marks, while incorrect answers deduct -1 mark (negative marking applies!). Thorough mastery of FSc Mathematics and Physics is essential.",
        "links": [{"label": "Explore Engineering Universities", "link": "/university-recommender"}]
    },

    # 18. NTS NAT Test Guide (COMSATS, etc.)
    {
        "id": "nat_test_guide",
        "category": "Admissions",
        "keywords": ["nts nat test", "nat test for comsats", "how to prepare nat test", "nat test format", "nat test"],
        "patterns": [
            "what is nts nat test in pakistan",
            "how to prepare for nat test for comsats",
            "nat test syllabus and passing marks",
            "how to get 80+ in nts nat test"
        ],
        "response": "NTS NAT (National Aptitude Test) is held monthly and accepted by COMSATS, Air University, Quaid-i-Azam University, and many public/private universities. Format: 90 MCQs in 120 minutes covering English (20), Analytical Reasoning (20), Quantitative Math (20), and Subject Knowledge (30). No negative marking! You can appear in multiple NAT attempts; universities consider your highest valid score.",
        "links": [{"label": "University Recommender", "link": "/university-recommender"}]
    },

    # 19. LAT Test Guide (Law Admission)
    {
        "id": "lat_test_guide",
        "category": "Law",
        "keywords": ["lat test", "law admission test", "hec lat test", "lat passing marks", "what are passing marks for lat test", "passing marks for lat"],
        "patterns": [
            "what is lat test for law admission in pakistan",
            "how to prepare for hec lat exam",
            "lat test syllabus marks and passing criteria",
            "is lat test compulsory for 5 years llb",
            "what are passing marks for lat test"
        ],
        "response": "HEC LAT (Law Admission Test) is legally mandatory for admission to any recognized 5-year BS LLB program in Pakistan. Format: 100 total marks (75 MCQs + 25 Descriptive marks). MCQs cover English (20), General Knowledge (20), Islamic Studies (10), Pakistan Studies (10), Urdu (10), and Math (5). The descriptive section requires an Essay (15 marks) and Personal Statement (10 marks). Minimum passing marks are 50.",
        "links": [{"label": "Find Law Universities", "link": "/university-recommender"}]
    },

    # 20. Pharm-D vs DPT
    {
        "id": "pharmd_vs_dpt",
        "category": "Medical",
        "keywords": ["pharm d vs dpt", "dpt vs pharm d", "difference between pharm d and dpt", "which is better pharm d or dpt"],
        "patterns": [
            "which is better pharm d or dpt in pakistan",
            "difference between doctor of pharmacy and doctor of physical therapy",
            "scope of pharm d vs dpt in pakistan",
            "salary of pharm d vs dpt"
        ],
        "response": "Pharm-D vs DPT Comparison:\n• Pharm-D (Doctor of Pharmacy): Focuses on pharmacological chemistry, clinical pharmacotherapy, hospital drug dispensing, and manufacturing. Strong career pathways in pharmaceutical production, QA/QC, and hospital pharmacy.\n• DPT (Doctor of Physical Therapy): Focuses on musculoskeletal rehabilitation, physical therapy, sports injuries, and neurological recovery. Graduates can establish their own private clinics and treat patients directly without medical doctor prescription.\nVerdict: Choose Pharm-D if you are interested in pharmaceuticals and corporate healthcare; choose DPT if you want direct hands-on patient rehabilitation and private clinical autonomy.",
        "links": [{"label": "Medical Recommender", "link": "/university-recommender"}]
    },

    # 21. CA vs ACCA
    {
        "id": "ca_vs_acca",
        "category": "Business",
        "keywords": ["ca vs acca", "acca vs ca", "difference between ca and acca", "which is better ca or acca in pakistan", "ca vs acca"],
        "patterns": [
            "difference between ca and acca in pakistan",
            "ca vs acca which has more scope and salary",
            "is ca better than acca in pakistan",
            "how difficult is ca compared to acca"
        ],
        "response": "CA (ICAP) vs ACCA Comparison:\n• CA (Chartered Accountancy) by ICAP: The gold standard for financial audit and corporate CFO roles in Pakistan. Extremely prestigious, demanding, with mandatory 3.5 years articleship in registered audit firms. Higher local statutory audit monopoly.\n• ACCA (UK): Globally recognized credential with modern flexible computer-based exams and international mobility across UK, Gulf, Canada, and Europe. Faster to complete.\nVerdict: For top corporate audit leadership in Pakistan, CA is unmatched. For international career mobility and flexible exam modularity, ACCA is preferable.",
        "links": [{"label": "Browse Scholarships", "link": "/scholarships"}]
    },

    # 22. BBA vs BS Accounting and Finance
    {
        "id": "bba_vs_acf",
        "category": "Business",
        "keywords": ["bba vs accounting and finance", "bba vs bs af", "difference between bba and acf", "bba or bs acf", "difference between bba and acf", "bba vs acf"],
        "patterns": [
            "difference between bba and bs accounting and finance",
            "bba vs bs af which is better",
            "should i do bba or accounting and finance",
            "scope of bba vs bs accounting and finance in pakistan"
        ],
        "response": "BBA vs BS Accounting & Finance:\n• BBA: Broad managerial qualification covering marketing, management, human resources, and business strategy. Best for students aiming for general management, marketing agencies, FMCG brand management, or starting a business.\n• BS Accounting & Finance: Quantitatively rigorous degree focusing on corporate finance, portfolio management, banking operations, and tax auditing. Provides major exemptions in professional qualifications like ACCA and CFA.\nChoose ACF if you enjoy numbers and financial analytics; choose BBA if you enjoy communication, marketing, and leadership.",
        "links": [{"label": "Business Universities", "link": "/university-recommender"}]
    },

    # 23. Highest Scope Engineering Field
    {
        "id": "top_engineering_fields",
        "category": "Engineering",
        "keywords": ["engineering field has highest scope", "which engineering field", "highest scope engineering", "which engineering field has highest scope", "best engineering fields in pakistan"],
        "patterns": [
            "which engineering field has highest scope in pakistan",
            "best engineering fields for future in pakistan",
            "electrical engineering vs mechanical engineering vs civil",
            "is engineering still good in pakistan",
            "scope of mechatronics and biomedical engineering"
        ],
        "response": "Key engineering disciplines in Pakistan with strong career longevity:\n1. Software Engineering: Highest immediate hiring demand and freelance potential.\n2. Electrical Engineering: Core discipline powering telecom, solar/renewable energy, embedded electronics, and industrial automation.\n3. Mechanical & Mechatronics Engineering: Powers manufacturing, automotive, robotics, and defense production.\n4. Civil Engineering: Essential for infrastructure, CPEC transport projects, and structural consultation.\nEnsure your chosen program is accredited under Washington Accord (Level II) by the Pakistan Engineering Council (PEC).",
        "links": [{"label": "Find Engineering Universities", "link": "/university-recommender"}]
    },

    # 24. HEC Need-Based Scholarship
    {
        "id": "hec_need_based",
        "category": "Scholarships",
        "keywords": ["hec need based", "how to apply hec scholarship", "hec scholarship eligibility", "hec financial aid", "how to get hec need based scholarship"],
        "patterns": [
            "how to get hec need based scholarship in pakistan",
            "what is the eligibility criteria for hec need based scholarship",
            "how to apply for hec financial aid in university",
            "what documents are required for hec need based scholarship"
        ],
        "response": "HEC Need-Based Scholarship covers 100% university tuition fees plus a monthly living stipend throughout your 4-year undergraduate degree. Eligibility: Enrolled in a participating public university, with verified monthly family income below PKR 45,000–60,000. Required documents: Electricity/gas utility bills, income certificates/salary slips, rent agreement (if applicable), and death certificate of guardian (if applicable). Applications are submitted through your university Financial Aid Office (FAO).",
        "links": [{"label": "View Scholarship Details", "link": "/scholarships"}]
    },

    # 25. PEEF Scholarship
    {
        "id": "peef_scholarship",
        "category": "Scholarships",
        "keywords": ["peef scholarship", "peef eligibility", "punjab educational endowment fund", "how to get peef", "peef scholarship eligibility"],
        "patterns": [
            "what is peef scholarship eligibility in pakistan",
            "how to apply for peef master or bachelor scholarship",
            "punjab educational endowment fund criteria and stipend",
            "minimum marks for peef scholarship"
        ],
        "response": "PEEF (Punjab Educational Endowment Fund) provides merit-cum-need educational assistance. Key eligibility requirements:\n1. Minimum 60% marks in intermediate or matric examination from a government or registered board.\n2. Total family monthly income equal to or less than PKR 40,000–60,000 (relaxed for children of grade 1-4 government servants and martyrs).\n3. Special quota seats available for orphans, minorities, disabled students, and special categories.",
        "links": [{"label": "Browse Scholarships", "link": "/scholarships"}]
    },

    # 26. Fee Structure of Top Universities
    {
        "id": "university_fee_structures",
        "category": "Admissions",
        "keywords": ["fee structure", "university fees", "fee structure of fast and nust", "how much is university fee in pakistan", "fee structure of nust fast comsats"],
        "patterns": [
            "what is the fee structure of nust fast comsats in pakistan",
            "how much does a semester cost in university in pakistan",
            "cheapest universities for computer science in pakistan",
            "fee structure of private versus government universities",
            "fee structure of fast and nust"
        ],
        "response": "Average semester fee benchmarks across Pakistan:\n• Public Universities (PU, UET, QAU): PKR 25,000 to 50,000 per semester.\n• Semi-Government (COMSATS): PKR 90,000 to 125,000 per semester.\n• Leading Tech (NUST): PKR 120,000 to 160,000 per semester.\n• Leading Tech (FAST-NUCES): PKR 150,000 to 195,000 per semester.\n• Elite Private (LUMS, GIKI): PKR 450,000 to 700,000+ per semester (with generous financial aid for deserving students).\nMost universities offer installment plans and merit fee waivers for top students.",
        "links": [{"label": "Compare University Costs", "link": "/university-recommender"}]
    },

    # 27. High-Income Freelancing Skills for Students
    {
        "id": "freelancing_skills",
        "category": "General",
        "keywords": ["freelancing skills", "how to earn while studying", "best freelancing skills for university students", "online earning for students", "how to earn while studying"],
        "patterns": [
            "what are the best freelancing skills for university students",
            "how can a student earn online in pakistan",
            "best skills to learn for freelancing on fiverr upwork",
            "can i earn 50000 per month while studying",
            "how to earn while studying"
        ],
        "response": "Top high-income freelancing skills students can master in 3 to 6 months:\n1. Web Development: HTML/CSS, JavaScript, React.js, WordPress/Shopify (earns $15–$35/hr).\n2. Graphic & UI/UX Design: Figma, Adobe Illustrator, Canva (earns $10–$25/hr).\n3. Python Automation & Data Scraping: High demand on Upwork for data cleaning and scripts.\n4. Content Writing & SEO: Technical copywriting, AI-assisted content optimization.\n5. Video Editing: Premiere Pro, After Effects, CapCut for YouTube and TikTok creators.\nStudents who dedicate 2 hours daily can comfortably earn PKR 40,000 to 100,000+ monthly.",
        "links": [{"label": "Explore Technology Streams", "link": "/result"}]
    }
]


def normalize_text(text):
    if not text:
        return ""
    t = text.lower().strip()
    for pattern, replacement in SYNONYMS.items():
        t = re.sub(pattern, replacement, t)
    return t


class AIChatbotEngine:
    def __init__(self):
        self.corpus = []
        self.entry_mapping = []
        for entry in EXPANDED_KNOWLEDGE_BASE:
            for pattern in entry["patterns"]:
                self.corpus.append(normalize_text(pattern))
                self.entry_mapping.append(entry)

        self.vectorizer = TfidfVectorizer(
            ngram_range=(1, 3),
            token_pattern=r"(?u)\b\w+\b",
            stop_words="english",
            sublinear_tf=True
        )
        self.tfidf_matrix = self.vectorizer.fit_transform(self.corpus)

    def predict(self, user_query, threshold=0.33):
        if not user_query or not str(user_query).strip():
            return {
                "response": "Hello! I am your CareerGuide AI Counseling Assistant. You can ask me anything about degrees, career scope, university admissions, or scholarships in Pakistan.",
                "links": [
                    {"label": "Career Assessment Quiz", "link": "/quiz"},
                    {"label": "University Recommender", "link": "/university-recommender"},
                    {"label": "Scholarship Finder", "link": "/scholarships"}
                ],
                "confidence": 1.0,
                "matchedTopic": "greeting"
            }

        raw_text = str(user_query).strip()
        clean_text = raw_text.lower()
        # Clean punctuation for intent / word matching
        stripped_text = re.sub(r"[^\w\s]", " ", clean_text)
        words = [w for w in stripped_text.split() if w]
        joined = " ".join(words)
        normalized_q = normalize_text(user_query)

        # -------------------------------------------------------------
        # 1. GREETINGS (hello, hey, hi, salam, aoa, good morning, etc.)
        # -------------------------------------------------------------
        GREETING_WORDS = {
            "hi", "hello", "hey", "salam", "assalam", "asalam", "aoa",
            "hiya", "hola", "greetings", "aslamoalikum", "asalamualaykum"
        }
        GREETING_PHRASES = [
            "assalam o alaikum", "assalam alaikum", "asalam alaikum", "assalamu alaikum",
            "good morning", "good afternoon", "good evening", "good day",
            "hey there", "hello there", "hello assistant", "hey assistant",
            "hello bot", "hey bot", "salam alaikum"
        ]
        is_greeting = False
        if any(joined == p or joined.startswith(p + " ") for p in GREETING_PHRASES):
            is_greeting = True
        elif words and all(w in GREETING_WORDS for w in words):
            is_greeting = True
        elif len(words) <= 3 and any(w in GREETING_WORDS for w in words) and not any(
            w in ["cs", "se", "ai", "engineering", "medical", "university", "merit", "scholarship", "fee", "mdcat", "net", "ecat"]
            for w in words
        ):
            is_greeting = True

        if is_greeting:
            return {
                "response": "Walekum Assalam & Hello! I am your CareerGuide AI Counseling Assistant.\n\n"
                            "I am here to guide Pakistani students on:\n"
                            "• Degree & career options (CS, Software Engineering, AI, MBBS, Engineering, Business, Law)\n"
                            "• University admissions, closing merits, & aggregate formulas (FAST, NUST, COMSATS, UET)\n"
                            "• Entry tests (MDCAT, ECAT, NET, NAT, LAT)\n"
                            "• Scholarships & financial aid (HEC Need-Based, PEEF, Ehsaas)\n\n"
                            "How can I help you today?",
                "links": [
                    {"label": "Career Assessment Quiz", "link": "/quiz"},
                    {"label": "University Recommender", "link": "/university-recommender"},
                    {"label": "Scholarship Finder", "link": "/scholarships"}
                ],
                "confidence": 1.0,
                "matchedTopic": "greeting"
            }

        # -------------------------------------------------------------
        # 2. BOT IDENTITY ("Who are you?", "What is your name?")
        # -------------------------------------------------------------
        IDENTITY_PHRASES = [
            "who are you", "what is your name", "what are you", "who made you",
            "who created you", "tell me about yourself", "are you an ai",
            "are you a bot", "what is this bot"
        ]
        if any(p in joined for p in IDENTITY_PHRASES):
            return {
                "response": "I am the CareerGuide AI Counseling Assistant! 🎓\n\n"
                            "I am an intelligent advisory assistant designed specifically to guide intermediate "
                            "and high-school students in Pakistan. I help you discover the most suitable career pathways, "
                            "compare degrees, calculate university admission aggregates, and explore accredited universities and scholarships.",
                "links": [
                    {"label": "Take Career Quiz", "link": "/quiz"},
                    {"label": "University Recommender", "link": "/university-recommender"}
                ],
                "confidence": 1.0,
                "matchedTopic": "identity"
            }

        # -------------------------------------------------------------
        # 3. HELP & CAPABILITIES ("What can you do?", "What questions can I ask?")
        # -------------------------------------------------------------
        GUIDANCE_PHRASES = [
            "what can you do", "what do you do", "how can you help", "how to use",
            "what questions can i ask", "what can i ask", "what to ask", "help me",
            "guide me", "how does this work", "options", "commands", "what are you for",
            "sample questions", "example questions"
        ]
        if joined == "help" or any(p in joined for p in GUIDANCE_PHRASES):
            return {
                "response": "Here is what I can help you with:\n\n"
                            "🎓 Degree Comparisons & Career Scope:\n"
                            "• 'Difference between CS and SE?'\n"
                            "• 'Scope of Artificial Intelligence in Pakistan?'\n"
                            "• 'Can Pre-Medical students do Computer Science?'\n"
                            "• 'Options after FSc Pre-Medical other than MBBS?'\n"
                            "• 'Options after FSc Pre-Engineering / ICS?'\n\n"
                            "🏛️ University Admissions & Aggregate Merit:\n"
                            "• 'What is FAST merit formula?'\n"
                            "• 'Fee structure and merit for COMSATS Lahore?'\n"
                            "• 'Top CS universities in Pakistan?'\n\n"
                            "📝 Entry Test Guidelines:\n"
                            "• 'MDCAT pattern and passing criteria?'\n"
                            "• 'NUST NET entry test guide and preparation?'\n"
                            "• 'ECAT guide for engineering admissions?'\n\n"
                            "💰 Scholarships & Financial Assistance:\n"
                            "• 'How to get HEC Need-Based scholarship?'\n"
                            "• 'PEEF scholarship eligibility criteria?'\n\n"
                            "You can also take our AI Career Quiz to discover which field matches your personality!",
                "links": [
                    {"label": "Start Career Quiz", "link": "/quiz"},
                    {"label": "University Recommender", "link": "/university-recommender"},
                    {"label": "Scholarship Finder", "link": "/scholarships"}
                ],
                "confidence": 1.0,
                "matchedTopic": "bot_guidance"
            }

        # -------------------------------------------------------------
        # 4. SMALL TALK ("How are you?")
        # -------------------------------------------------------------
        SMALLTALK_PHRASES = [
            "how are you", "how are you doing", "how r u", "how do you do",
            "how is it going", "hows it going", "hope you are well", "are you okay"
        ]
        if any(p in joined for p in SMALLTALK_PHRASES):
            return {
                "response": "I'm doing great, thank you for asking! 😊 I'm ready to help you with your degree options, university admissions, and scholarships. What would you like to explore today?",
                "links": [
                    {"label": "University Recommender", "link": "/university-recommender"},
                    {"label": "Career Assessment", "link": "/quiz"}
                ],
                "confidence": 1.0,
                "matchedTopic": "smalltalk"
            }

        # -------------------------------------------------------------
        # 5. GRATITUDE ("Thank you", "Thanks")
        # -------------------------------------------------------------
        THANKS_WORDS = ["thank you", "thanks", "thanks a lot", "thank u", "thx", "jazakallah", "jazak allah", "shukriya", "thankyou"]
        if any(t in joined for t in THANKS_WORDS):
            return {
                "response": "You're very welcome! If you have any more questions about university cutoffs, degrees, or scholarships, feel free to ask anytime. Best of luck with your studies!",
                "links": [],
                "confidence": 1.0,
                "matchedTopic": "thanks"
            }

        # -------------------------------------------------------------
        # 6. FAREWELLS ("Bye", "Goodbye", "Allah Hafiz")
        # -------------------------------------------------------------
        BYE_WORDS = ["bye", "goodbye", "see you", "allah hafiz", "khuda hafiz", "take care", "bye bye", "good night"]
        if any(b in joined for b in BYE_WORDS):
            return {
                "response": "Allah Hafiz and goodbye! Wishing you huge success in your academic and career journey. Come back whenever you need counseling!",
                "links": [],
                "confidence": 1.0,
                "matchedTopic": "farewell"
            }

        # -------------------------------------------------------------
        # 7. COMPLIMENTS / POSITIVE FEEDBACK
        # -------------------------------------------------------------
        COMPLIMENT_WORDS = ["good job", "awesome", "great job", "well done", "cool", "nice bot", "helpful bot", "great bot"]
        if any(c in joined for c in COMPLIMENT_WORDS) and len(words) <= 4:
            return {
                "response": "Thank you! I'm glad I could help. Let me know if there's anything else you need about degrees or university admissions.",
                "links": [],
                "confidence": 1.0,
                "matchedTopic": "compliment"
            }

        # -------------------------------------------------------------
        # 8. PASS 1: High-precision Keyword Priority Match
        # -------------------------------------------------------------
        for entry in EXPANDED_KNOWLEDGE_BASE:
            for kw in entry.get("keywords", []):
                norm_kw = kw.lower().strip()
                if norm_kw in clean_text or norm_kw in normalized_q:
                    return {
                        "response": entry["response"],
                        "links": entry.get("links", []),
                        "confidence": 0.99,
                        "matchedTopic": entry["id"]
                    }

        # -------------------------------------------------------------
        # 9. PASS 2: TF-IDF Cosine Similarity Semantic Matching
        # -------------------------------------------------------------
        try:
            q_vec = self.vectorizer.transform([normalized_q])
            sims = cosine_similarity(q_vec, self.tfidf_matrix)[0]
            best_idx = int(np.argmax(sims))
            best_score = float(sims[best_idx])

            # Safety check: Verify the query shares more than just generic stopwords/location words
            if best_score >= threshold:
                matched_entry = self.entry_mapping[best_idx]
                return {
                    "response": matched_entry["response"],
                    "links": matched_entry.get("links", []),
                    "confidence": round(best_score, 3),
                    "matchedTopic": matched_entry["id"]
                }
        except Exception:
            pass

        # -------------------------------------------------------------
        # 10. CONTEXTUAL KEYWORD FALLBACKS
        # -------------------------------------------------------------
        if any(w in clean_text for w in ["universit", "college", "admission", "merit", "cutoff"]):
            return {
                "response": "For university admissions in Pakistan, undergraduate programs typically require 50% to 70%+ marks in Intermediate (FSc/ICS) and a valid entry test score (NET, ECAT, MDCAT, or NAT). You can use our University Recommender to view exact cutoff percentages and eligible universities.",
                "links": [{"label": "Open University Recommender", "link": "/university-recommender"}],
                "confidence": 0.5,
                "matchedTopic": "university_fallback"
            }

        if any(w in clean_text for w in ["scholarship", "financial aid", "fee", "funding"]):
            return {
                "response": "Pakistan offers multiple verified funding options including HEC Need-Based Aid, PEEF, Ehsaas, and university merit concessions. You can search, filter by province, and check requirements in our Scholarship Finder.",
                "links": [{"label": "Open Scholarship Finder", "link": "/scholarships"}],
                "confidence": 0.5,
                "matchedTopic": "scholarship_fallback"
            }

        if any(w in clean_text for w in ["quiz", "test", "assessment", "result", "field"]):
            return {
                "response": "You can take our 5-minute career assessment to find your ideal career stream based on your academic background and interests.",
                "links": [
                    {"label": "Start Career Quiz", "link": "/quiz"},
                    {"label": "View Results", "link": "/result"}
                ],
                "confidence": 0.5,
                "matchedTopic": "quiz_fallback"
            }

        # -------------------------------------------------------------
        # 11. UNCOMMON / OUT-OF-SCOPE GUIDANCE FALLBACK
        # -------------------------------------------------------------
        return {
            "response": "I specialize specifically in career counseling, degree programs, university admissions, and scholarships in Pakistan.\n\n"
                        "I may not have an answer for that specific query, but I can gladly help you with:\n"
                        "• Degree Comparisons: e.g. 'CS vs SE', 'CS vs AI', 'Options after Pre-Medical'\n"
                        "• University Admissions: e.g. 'FAST merit formula', 'Fee structure of COMSATS', 'Top CS universities'\n"
                        "• Entry Test Guidance: e.g. 'MDCAT pattern & preparation', 'NUST NET guide', 'ECAT guide'\n"
                        "• Scholarships: e.g. 'HEC Need-Based scholarship', 'PEEF eligibility criteria'\n\n"
                        "Try asking one of the questions above, or take our Career Assessment Quiz below!",
            "links": [
                {"label": "Take Career Quiz", "link": "/quiz"},
                {"label": "Explore Universities", "link": "/university-recommender"},
                {"label": "Find Scholarships", "link": "/scholarships"}
            ],
            "confidence": 0.0,
            "matchedTopic": "fallback"
        }


# Global singleton instance
chatbot_engine = AIChatbotEngine()
