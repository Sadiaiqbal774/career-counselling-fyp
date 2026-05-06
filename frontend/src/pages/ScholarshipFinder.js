function ScholarshipFinder() {
  return (
    <div
      style={{
        padding: '40px',
        minHeight: '100vh',
        background: '#f5f5f5'
      }}
    >
      <h1>🎓 Scholarship Finder</h1>

      <p>
        Find scholarships based on your academic background,
        marks, and interests.
      </p>

      <div
        style={{
          marginTop: '30px',
          background: 'white',
          padding: '20px',
          borderRadius: '10px'
        }}
      >
        <h2>Available Scholarships</h2>

        <ul>
          <li>HEC Need Based Scholarship</li>
          <li>Ehsaas Undergraduate Scholarship</li>
          <li>PEEF Scholarship</li>
          <li>Punjab Educational Endowment Fund</li>
          <li>USAID Merit Scholarship</li>
        </ul>
      </div>
    </div>
  );
}

export default ScholarshipFinder;