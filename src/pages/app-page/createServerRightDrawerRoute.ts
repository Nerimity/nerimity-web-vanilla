import { createRightDrawer } from "../../components/drawer-right/RightDrawer";
import { Drawer } from "../../components/ui/drawer";

const createServerRightDrawerRoute = () => {
  const rightDrawer = createRightDrawer();
  const drawer = Drawer();

  drawer.rightDrawer.replaceChildren(rightDrawer.render());

  const destroy = () => {
    rightDrawer.destroy();
  };

  return { destroy };
};

export default createServerRightDrawerRoute;
