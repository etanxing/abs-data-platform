import Link from "next/link";

export function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 py-16 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-10 mb-12">
          <div className="sm:col-span-2">
            <span className="text-xl font-bold text-white block mb-3">GrantData</span>
            <p className="text-sm leading-relaxed max-w-sm">
              ABS Census data made accessible for community organisations, social service
              providers, and grant writers across Australia.
            </p>
            <p className="text-xs mt-4 text-gray-500">
              Data sourced from the Australian Bureau of Statistics under{" "}
              <a
                href="https://www.abs.gov.au/websitedbs/D3310114.nsf/Home/©Copyright?OpenDocument"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors"
              >
                Creative Commons Attribution 4.0
              </a>
              .
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Product</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
              <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
              <li><Link href="/register" className="hover:text-white transition-colors">Free Trial</Link></li>
              <li><Link href="/login" className="hover:text-white transition-colors">Sign In</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Account</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/register" className="hover:text-white transition-colors">Create Account</Link></li>
              <li><Link href="/login" className="hover:text-white transition-colors">Login</Link></li>
              <li><Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link></li>
              <li><Link href="/dashboard/billing" className="hover:text-white transition-colors">Billing</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm">
            &copy; {new Date().getFullYear()} GrantData. Built on official ABS data.
          </p>
          <p className="text-xs text-gray-600">
            Not affiliated with the Australian Bureau of Statistics.
          </p>
        </div>
      </div>
    </footer>
  );
}
