import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";

/**
 * GET /api/payroll — List employees with salary info, or payroll runs for a month
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthUserId();
    const { searchParams } = new URL(request.url);
    const view = searchParams.get("view") || "employees"; // employees | runs
    const month = searchParams.get("month");

    if (view === "runs" && month) {
      const runs = await prisma.payrollRun.findMany({
        where: { userId, month },
        include: { employee: { select: { name: true, employeeId: true, designation: true } } },
        orderBy: { employee: { name: "asc" } },
      });

      const totalGross = runs.reduce((s, r) => s + Number(r.grossPay), 0);
      const totalDeductions = runs.reduce((s, r) => s + Number(r.totalDeductions), 0);
      const totalNet = runs.reduce((s, r) => s + Number(r.netPay), 0);
      const totalPfEmployer = runs.reduce((s, r) => s + Number(r.pfEmployer), 0);
      const totalEsiEmployer = runs.reduce((s, r) => s + Number(r.esiEmployer), 0);

      return NextResponse.json({
        month,
        runs: runs.map((r) => ({
          id: r.id,
          employeeId: r.employee.employeeId,
          name: r.employee.name,
          designation: r.employee.designation,
          status: r.status,
          grossPay: Number(r.grossPay),
          pfEmployee: Number(r.pfEmployee),
          esiEmployee: Number(r.esiEmployee),
          professionalTax: Number(r.professionalTax),
          tds: Number(r.tds),
          totalDeductions: Number(r.totalDeductions),
          netPay: Number(r.netPay),
        })),
        summary: { totalGross, totalDeductions, totalNet, totalPfEmployer, totalEsiEmployer, employeeCount: runs.length, companyCost: totalGross + totalPfEmployer + totalEsiEmployer },
      });
    }

    // List employees
    const employees = await prisma.employee.findMany({
      where: { userId, isActive: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      employees: employees.map((e) => ({
        id: e.id,
        employeeId: e.employeeId,
        name: e.name,
        email: e.email,
        designation: e.designation,
        department: e.department,
        basicSalary: Number(e.basicSalary),
        hra: Number(e.hra),
        ctc: Number(e.ctc),
        isActive: e.isActive,
        joinDate: e.joinDate.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Payroll GET error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

/**
 * POST /api/payroll — Add employee or run payroll
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthUserId();
    const body = await request.json();
    const { action } = body;

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { organizationId: true } });

    if (action === "add_employee") {
      const { name, email, designation, department, basicSalary, hra, da, specialAllowance, ctc } = body;
      const count = await prisma.employee.count({ where: { userId } });
      const employee = await prisma.employee.create({
        data: {
          employeeId: `EMP-${String(count + 1).padStart(3, "0")}`,
          name, email, designation, department,
          basicSalary: basicSalary || 0,
          hra: hra || 0,
          da: da || 0,
          specialAllowance: specialAllowance || 0,
          ctc: ctc || (basicSalary || 0) * 12,
          userId,
          organizationId: user?.organizationId,
        },
      });
      return NextResponse.json(employee, { status: 201 });
    }

    if (action === "run_payroll") {
      const { month } = body;
      if (!month) return NextResponse.json({ error: "Month required" }, { status: 400 });

      // Check if already run
      const existing = await prisma.payrollRun.findFirst({ where: { userId, month } });
      if (existing) return NextResponse.json({ error: "Payroll already run for this month" }, { status: 409 });

      const employees = await prisma.employee.findMany({ where: { userId, isActive: true } });
      const runs = [];

      for (const emp of employees) {
        const basic = Number(emp.basicSalary);
        const hraVal = Number(emp.hra);
        const daVal = Number(emp.da);
        const special = Number(emp.specialAllowance);
        const other = Number(emp.otherAllowance);
        const gross = basic + hraVal + daVal + special + other;

        // Statutory deductions
        const pfEmployee = Math.min(Math.round(basic * 0.12), 1800); // 12% of basic, max ₹1800/mo on 15000 ceiling
        const pfEmployer = pfEmployee;
        const esiEmployee = gross <= 21000 ? Math.round(gross * 0.0075) : 0;
        const esiEmployer = gross <= 21000 ? Math.round(gross * 0.0325) : 0;
        const professionalTax = gross > 15000 ? 200 : gross > 10000 ? 150 : 0; // Karnataka rates
        const tds = Math.round(basic * 0.1); // Simplified: 10% of basic as monthly TDS estimate

        const totalDeductions = pfEmployee + esiEmployee + professionalTax + tds;
        const netPay = gross - totalDeductions;

        const run = await prisma.payrollRun.create({
          data: {
            month,
            status: "processed",
            employeeId: emp.id,
            basicPay: basic,
            hraPay: hraVal,
            daPay: daVal,
            specialPay: special,
            otherPay: other,
            grossPay: gross,
            pfEmployee, pfEmployer,
            esiEmployee, esiEmployer,
            professionalTax, tds,
            otherDeductions: 0,
            totalDeductions,
            netPay,
            userId,
            organizationId: user?.organizationId,
          },
        });
        runs.push(run);
      }

      return NextResponse.json({ processed: runs.length, month }, { status: 201 });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Payroll POST error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
