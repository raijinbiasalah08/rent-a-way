import { Navigate, useLocation } from "react-router-dom";
export default function Checkout() {
  const { search } = useLocation();
  const query = new URLSearchParams(search);
  const product = query.get("product_id");
  query.delete("product_id");
  query.delete("protection");
  return (
    <Navigate
      replace
      to={
        product
          ? `/customer/booking/${encodeURIComponent(product)}?${query}`
          : "/browse"
      }
    />
  );
}
