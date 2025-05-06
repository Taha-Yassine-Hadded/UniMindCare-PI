import { CardHeader } from "reactstrap";
import { H4, P } from "../../../../AbstractElements";

const TotalGrowthCardHeader = ({ stats }) => {
  // stats = { total, confirmed, cancelled, pending }
  return (
    <CardHeader className="pb-0">
      <div className="d-flex justify-content-between">
        <div className="flex-grow-1">
          <P attrPara={{ className: "square-after f-w-600 header-text-primary" }}>
            Statistiques Rendez-vous
            <i className="fa fa-circle f-10"> </i>
          </P>
        
        </div>
      </div>
    </CardHeader>
  );
};

export default TotalGrowthCardHeader;