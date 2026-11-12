const requests: unknown[] = [];
function req(
  name: string,
  method: string,
  path: string,
  status: number,
  body?: unknown,
  token?: string,
  extra: string[] = [],
) {
  requests.push({
    name,
    request: {
      method,
      header: [
        ...(body ? [{ key: "Content-Type", value: "application/json" }] : []),
        ...(token
          ? [{ key: "Authorization", value: `Bearer {{${token}}}` }]
          : []),
      ],
      auth: { type: "noauth" },
      url: `{{base_url}}${path}`,
      ...(body
        ? {
            body: {
              mode: "raw",
              raw: JSON.stringify(body),
              options: { raw: { language: "json" } },
            },
          }
        : {}),
    },
    event: [
      {
        listen: "test",
        script: {
          type: "text/javascript",
          exec: [
            `pm.test('HTTP ${status}',()=>pm.response.to.have.status(${status}));`,
            `pm.test('JSON response',()=>pm.response.to.be.json);`,
            ...extra,
          ],
        },
      },
    ],
  });
}
req("Health", "GET", "/health", 200, undefined, undefined, [
  "pm.test('Database connected',()=>pm.expect(pm.response.json().db).to.eql('connected')); ",
]);
req(
  "Organizer login",
  "POST",
  "/api/auth/login",
  200,
  { email: "{{admin_email}}", password: "{{admin_password}}" },
  undefined,
  ["pm.environment.set('admin_token',pm.response.json().token);"],
);
req(
  "Organizer creates team 1 with an access code",
  "POST",
  "/api/admin/teams/generate",
  200,
  { count: 1 },
  "admin_token",
  [
    "const t=pm.response.json().participants.find(p=>p.teamNumber===1);pm.environment.set('team_code',t.accessCode);pm.test('Code issued',()=>pm.expect(t.accessCode).to.match(/^[A-Z2-9]{6}$/));pm.test('Target assigned',()=>pm.expect(t.objective.id).to.be.oneOf(['growth','premium','cost','customer']));",
  ],
);
req(
  "Team signs in with number and code",
  "POST",
  "/api/auth/team",
  200,
  { teamNumber: 1, code: "{{team_code}}" },
  undefined,
  [
    "const b=pm.response.json(); pm.environment.set('player_token',b.token); pm.environment.set('player_id',b.user.id);",
  ],
);
req(
  "Player forbidden from rankings",
  "GET",
  "/api/admin/leaderboard",
  403,
  undefined,
  "player_token",
);
req(
  "List departments",
  "GET",
  "/api/departments",
  200,
  undefined,
  "player_token",
  [
    "const d=pm.response.json().departments[0];pm.environment.set('department_id',d.id);pm.test('Eight disciplines',()=>pm.expect(pm.response.json().departments.length).to.eql(8));",
  ],
);
req(
  "Read organizer question bank",
  "GET",
  "/api/admin/questions",
  200,
  undefined,
  "admin_token",
  [
    "const qs=pm.response.json().questions.filter(q=>q.departmentId===pm.environment.get('department_id')).sort((a,b)=>a.questionNumber-b.questionNumber);qs.forEach((q,i)=>{pm.environment.set('q'+(i+1),q.id);pm.environment.set('choice'+(i+1),q.options[0].id)});",
  ],
);
req(
  "Player cannot read answer bank",
  "GET",
  "/api/admin/questions",
  403,
  undefined,
  "player_token",
);
req(
  "Locked lobby reveals no question",
  "GET",
  "/api/departments/{{department_id}}/state",
  200,
  undefined,
  "player_token",
  [
    "pm.test('Q1 locked',()=>pm.expect(pm.response.json().status).to.eql('locked'));pm.test('No answer keys',()=>pm.expect(pm.response.json().question).to.eql(null));",
  ],
);
req(
  "Reject Q1 before organizer start",
  "POST",
  "/api/departments/{{department_id}}/answer",
  403,
  { questionId: "{{q1}}", optionIds: ["{{choice1}}"], reason: "postman reason" },
  "player_token",
);
req(
  "Player cannot open gate",
  "POST",
  "/api/admin/departments/{{department_id}}/start-q1",
  403,
  {},
  "player_token",
);
req(
  "Organizer opens Q1",
  "POST",
  "/api/admin/departments/{{department_id}}/start-q1",
  200,
  {},
  "admin_token",
);
req(
  "Reject skipping Q1",
  "POST",
  "/api/departments/{{department_id}}/answer",
  400,
  { questionId: "{{q2}}", optionIds: ["{{choice2}}"], reason: "postman reason" },
  "player_token",
);
req(
  "Submit Q1 and auto-advance Q2",
  "POST",
  "/api/departments/{{department_id}}/answer",
  200,
  { questionId: "{{q1}}", optionIds: ["{{choice1}}"], reason: "postman reason" },
  "player_token",
  [
    "pm.test('Auto-advanced to Q2',()=>pm.expect(pm.response.json().state.unlockedQuestion).to.eql(2));",
  ],
);
req(
  "Duplicate submission rejected",
  "POST",
  "/api/departments/{{department_id}}/answer",
  409,
  { questionId: "{{q1}}", optionIds: ["{{choice1}}"], reason: "postman reason" },
  "player_token",
);
req(
  "Target locked after first answer",
  "PATCH",
  "/api/admin/participants/{{player_id}}/objective",
  409,
  { objectiveId: "customer" },
  "admin_token",
);
req(
  "Submit Q2 and auto-advance Q3",
  "POST",
  "/api/departments/{{department_id}}/answer",
  200,
  { questionId: "{{q2}}", optionIds: ["{{choice2}}"], reason: "postman reason" },
  "player_token",
  [
    "pm.test('Auto-advanced to Q3',()=>pm.expect(pm.response.json().state.unlockedQuestion).to.eql(3));",
  ],
);
req(
  "Submit Q3 and earn stamp",
  "POST",
  "/api/departments/{{department_id}}/answer",
  200,
  { questionId: "{{q3}}", optionIds: ["{{choice3}}"], reason: "postman reason" },
  "player_token",
  [
    "pm.test('Discipline complete',()=>pm.expect(pm.response.json().state.status).to.eql('completed')); ",
  ],
);
req(
  "Own passport has no rankings",
  "GET",
  "/api/passport",
  200,
  undefined,
  "player_token",
  [
    "const p=pm.response.json();pm.test('Three saved decisions',()=>pm.expect(p.answered).to.eql(3));pm.test('Rankings absent',()=>{pm.expect(p.rank).to.eql(undefined);pm.expect(p.leaderboard).to.eql(undefined);});",
  ],
);
req(
  "Admin standings mark Top 4",
  "GET",
  "/api/admin/leaderboard",
  200,
  undefined,
  "admin_token",
  [
    "pm.test('Top 10 flags are correct',()=>pm.response.json().leaderboard.forEach(r=>pm.expect(r.isTop).to.eql(r.rank<=10))); ",
  ],
);
await Bun.write(
  "postman/AcademicVerse.postman_collection.json",
  JSON.stringify(
    {
      info: {
        name: "AcademicVerse — game rules and access control",
        description:
          "Run ONLY against a fresh disposable businessverse_test service. This suite creates team 1 with an access code and opens the first gate. Set organizer credentials in your local environment; never commit them.",
        schema:
          "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
      },
      item: requests,
    },
    null,
    2,
  ) + "\n",
);
await Bun.write(
  "postman/Docker.postman_environment.json",
  JSON.stringify(
    {
      name: "AcademicVerse Docker — disposable test",
      values: [
        { key: "base_url", value: "http://localhost:3002", enabled: true },
        { key: "admin_email", value: "", enabled: true },
        { key: "admin_password", value: "", type: "secret", enabled: true },
      ],
      _postman_variable_scope: "environment",
    },
    null,
    2,
  ) + "\n",
);
